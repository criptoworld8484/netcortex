import type Database from "better-sqlite3";

const VENDORS = [
  { name: "Cisco", slug: "cisco", color: "#049fd9" },
  { name: "Juniper", slug: "juniper", color: "#84b135" },
  { name: "FortiGate", slug: "fortigate", color: "#da291c" },
  { name: "Palo Alto", slug: "paloalto", color: "#f04e23" },
  { name: "Check Point", slug: "checkpoint", color: "#9d7cd8" },
];

const TECHNOLOGIES = [
  ["BGP", "Routing"],
  ["OSPF", "Routing"],
  ["Static routing", "Routing"],
  ["SD-WAN", "Routing"],
  ["IPsec site-to-site", "VPN"],
  ["SSL VPN", "VPN"],
  ["NAT", "Security"],
  ["Firewall policy", "Security"],
  ["Threat prevention", "Security"],
  ["STP / L2", "Switching"],
  ["VLAN", "Switching"],
  ["Port security", "Switching"],
  ["Interfaces / optics", "Infrastructure"],
  ["HA clustering", "Infrastructure"],
  ["DHCP", "Infrastructure"],
  ["DNS", "Infrastructure"],
  ["NTP / Time", "System"],
  ["Licensing", "System"],
  ["Management / AAA", "System"],
];

interface CauseSeed {
  description: string;
  verify: string;
  fix: string;
}

interface ErrorSeed {
  title: string;
  pattern: string;
  patternType: "exact" | "regex";
  vendor: string | null;
  meaning: string;
  causes: CauseSeed[];
}

const ERROR_SEEDS: ErrorSeed[] = [
  {
    title: "IKE: No proposal chosen",
    pattern: "no proposal chosen",
    patternType: "exact",
    vendor: null,
    meaning:
      "The IKE proposal offered by the peer does not overlap with any locally configured proposal (phase 1 or phase 2). Encryption, integrity/hash, DH group (PFS for phase 2), PRF and lifetime must match on both peers.",
    causes: [
      {
        description: "Proposal parameter mismatch (encryption / hash / DH group / lifetime)",
        verify:
          "**Cisco:** `show crypto isakmp policy`, `show crypto ipsec transform-set`\n**Juniper:** `show configuration security ike proposal`\n**FortiGate:** `get vpn ipsec phase1 detail`\n**Palo Alto:** `show running-config tunnel`\n**Check Point:** `vpn cuADV ikecrypt -a` / SmartView IKE debug",
        fix: "Align phase 1/2 proposal parameters on both peers. Check that DH group on phase 1 and PFS group on phase 2 match exactly, and that lifetimes are compatible.",
      },
      {
        description: "Peer does not support the configured DH/PFS group (legacy device)",
        verify: "Check vendor release notes / `show crypto isakmp policy` on both sides.",
        fix: "Downgrade to a DH group supported by the legacy peer (e.g. group 2 instead of 14/19/20) or upgrade the legacy device.",
      },
      {
        description: "Route-based peer talking to policy-based peer with wrong gateway/proposal binding",
        verify: "Compare tunnel type on both ends: `get vpn ipsec tunnel list` (FortiGate), `show configuration security ipsec vpn` (Juniper).",
        fix: "Bind the correct phase 1 interface/gateway and ensure both ends agree on policy-based vs route-based mode (use route-based where possible).",
      },
    ],
  },
  {
    title: "Pre-shared key mismatch (AUTHENTICATION_FAILED)",
    pattern: "(authentication failed|authentication-failed|psk mismatch|no sa has been authorized)",
    patternType: "regex",
    vendor: null,
    meaning:
      "IKE failed authentication: the pre-shared keys (or identities) on both peers do not match. This is a phase 1 error raised after the SA proposal was agreed.",
    causes: [
      {
        description: "PSK typo, trailing whitespace or wrong key on one peer",
        verify: "Re-enter the PSK on both peers; test with a temporary simple key during a window.",
        fix: "Set the identical PSK on both peers, avoiding copy/paste of hidden whitespace.",
      },
      {
        description: "Peer ID / local ID mismatch (wrong interface or ID type used as identity)",
        verify: "**FortiGate:** `diag vpn ike gateway list` (peer ID shown)\n**Palo Alto:** `show running tunnel ike-sa gateway`\n**Juniper:** `show security ike security-associations detail`",
        fix: "Configure local-id / peer-id explicitly and identically on both peers (FQDN, UFQDN or IP type as needed).",
      },
      {
        description: "NAT between peers hiding the real identity (need NAT-T + correct peer addressing)",
        verify: "Confirm whether NAT exists in path: peer config points to public IP while tunnel binds private IP.",
        fix: "Enable NAT-T and configure the correct peer address / local-address (external-interface) on both sides.",
      },
    ],
  },
  {
    title: "Cisco: Invalid SPI received (RECVD_PKT_INV_SPI)",
    pattern: "recvd_pkt_inv_spi",
    patternType: "exact",
    vendor: "cisco",
    meaning:
      "The router received an ESP packet whose Security Parameter Index does not correspond to any active IPsec SA. Usually the peers' SAs are out of sync (one side rekeyed or flushed, the other did not).",
    causes: [
      {
        description: "Asymmetric SA state after peer rekey or reboot (stale SA on one side)",
        verify: "`show crypto session detail`, `show crypto ipsec sa peer <ip> | include spi|peer`",
        fix: "Clear the stale SA: `clear crypto session remote <ip>` and let IKE re-establish. Both sides renegotiate.",
      },
      {
        description: "DPD not enabled, so dead peers are not detected and SAs diverge",
        verify: "`show crypto isakmp policy` / `show run crypto map | include set security-association lifetime`",
        fix: "Enable DPD (`crypto isakmp keepalive 10 periodic`) and align SA lifetimes on both peers.",
      },
      {
        description: "Stateful failover / hardware change left mismatched SPI tables",
        verify: "`show crypto ipsec sa | include spi` on both HA members.",
        fix: "Clear and renegotiate IPsec SAs on both HA members after the failover event.",
      },
    ],
  },
  {
    title: "Cisco: Proxy identities not supported",
    pattern: "proxy identities not supported",
    patternType: "exact",
    vendor: "cisco",
    meaning:
      "Phase 2 negotiation failed because the traffic selectors (proxy IDs / interesting traffic ACL) offered by the peer do not match the locally configured crypto map ACL.",
    causes: [
      {
        description: "Crypto map ACL does not mirror the peer's selectors (subnets or order differ)",
        verify: "`show run crypto map`, `show crypto ipsec sa peer <ip> | include local ident|remote ident`",
        fix: "Make the local ACL an exact mirror (in reverse) of the peer's selector config.",
      },
      {
        description: "Interoperating with a route-based peer that requires broad proxy IDs",
        verify: "Identify peer platform; route-based vendors (Juniper/Palo Alto) commonly negotiate 0.0.0.0/0 unless configured.",
        fix: "Set the route-based peer to send specific selectors, or configure the Cisco side with matching broad proxy-id where supported.",
      },
      {
        description: "Summarization mismatch (one side uses summary route, other specific subnets)",
        verify: "Compare advertised selectors on both ends in `show crypto ipsec sa`.",
        fix: "Use identical selector definitions; avoid mixing summary and specific prefixes.",
      },
    ],
  },
  {
    title: "BGP NOTIFICATION sent/received",
    pattern: "%bgp-[0-9]+-notification",
    patternType: "regex",
    vendor: null,
    meaning:
      "The BGP session was reset with a NOTIFICATION message. The error code/subcode in the same log line tells the exact reason (hold time expired, malformed update, CEASE, bad MD5...).",
    causes: [
      {
        description: "Hold time expired: packets/keepalives delayed by CPU or congestion",
        verify: "**Cisco:** `show ip bgp neighbors | include Last reset|hold`\n**Juniper:** `show bgp neighbor detail`",
        fix: "Check CPU/interface errors; consider increasing timers or enabling BGP session damping appropriately.",
      },
      {
        description: "TCP 179 blocked or filtered in one direction (firewall/ACL)",
        verify: "`show ip bgp neighbors` (state Idle/Active oscillation), test with `telnet <peer> 179` / packet-trace.",
        fix: "Allow TCP 179 (and established return traffic) between loopbacks/peering addresses on every transit firewall.",
      },
      {
        description: "MD5 password mismatch (TCP reset visible, notification may follow)",
        verify: "`show ip bgp neighbors | include authentication`, debug tcp md5.",
        fix: "Set the same `neighbor <ip> password <key>` on both peers.",
      },
      {
        description: "Malformed update / unsupported capability from peer",
        verify: "Decode the NOTIFICATION subcode in the log; `debug ip bgp updates`.",
        fix: "Align capabilities (RFC 4893 4-byte ASN, refresh, add-path); filter offending attribute if from a third party.",
      },
    ],
  },
  {
    title: "OSPF adjacency down: dead timer expired",
    pattern: "dead ?timer expired",
    patternType: "regex",
    vendor: null,
    meaning:
      "OSPF hellos were not received from the neighbor within the dead interval, so the adjacency was torn down. Generic symptom with several classic causes.",
    causes: [
      {
        description: "Hello/dead interval mismatch between interfaces",
        verify: "**Cisco:** `show ip ospf interface brief` + `show ip ospf neighbor`\n**Juniper:** `show ospf interface detail`",
        fix: "Set identical timers (hello 10 / dead 40 default) on both ends.",
      },
      {
        description: "Multicast 224.0.0.5/6 blocked or L2 issue dropping hellos",
        verify: "Interface error counters; `show ip ospf traffic`; span/mirror the port if needed.",
        fix: "Fix L2 transport (duplex, SFP errors, ACLs on the segment, multicast scoping).",
      },
      {
        description: "MTU mismatch blocking DBD exchange (adjacency stuck in EXSTART/EXCHANGE)",
        verify: "`show ip ospf neighbor` (stuck states), `show ip interface | include MTU`",
        fix: "Match MTU on both ends or adjust `ip ospf mtu-ignore` temporarily while fixing the real MTU.",
      },
      {
        description: "Control-plane CPU starvation on one router",
        verify: "`show process cpu sorted`, OSPF packet drops in `show ip ospf statistics`.",
        fix: "Investigate the CPU hog; consider SPD / scheduler tuning or hardware upgrade.",
      },
    ],
  },
  {
    title: "FortiGate: SSL VPN login failed",
    pattern: "sslvpn_login_failed",
    patternType: "exact",
    vendor: "fortigate",
    meaning:
      "SSL VPN user authentication or authorization failed, logged by the FortiGate sslvpn daemon with a reason subcode.",
    causes: [
      {
        description: "Wrong credentials or account locked out / expired",
        verify: "`diag debug application sslvpn -1` and check reason code; test user auth: `diag test authserver ...`",
        fix: "Reset/unlock the account and verify the remote group configuration.",
      },
      {
        description: "User group not bound to the SSL VPN portal / policy",
        verify: "`show vpn ssl portal`, `show vpn ssl settings` + firewall policy for ssl.root",
        fix: "Map the user group to the tunnel/web portal and include it in the SSL VPN firewall policy.",
      },
      {
        description: "Source IP outside allowed range (reserved range / firewall address conflicts)",
        verify: "`get vpn ssl settings` (dns / range), tunnel IP pool overlap check.",
        fix: "Expand the tunnel IP range or resolve overlaps with internal networks.",
      },
      {
        description: "RADIUS/LDAP backend unreachable or timeout",
        verify: "`diag test authserver radius <srv> <user> <pass>`, `diag sniff packet` to backend.",
        fix: "Restore connectivity/secret to the auth backend; check NAS-IP and shared secret.",
      },
    ],
  },
  {
    title: "FortiGate: IPsec phase 2 error",
    pattern: "ipsec phase 2 error",
    patternType: "exact",
    vendor: "fortigate",
    meaning:
      "FortiGate event log raised when the IPsec phase 2 (quick mode) negotiation or installation failed for a tunnel.",
    causes: [
      {
        description: "Phase 2 proposal (PFS group, encryption, lifetime) mismatch",
        verify: "`get vpn ipsec phase2 detail`, `diag vpn tunnel list`",
        fix: "Match PFS group and phase 2 proposals on both peers.",
      },
      {
        description: "Quick mode selectors (src/dst subnets) do not overlap with the peer",
        verify: "`get vpn ipsec phase2 detail` (src/dst range) vs peer config.",
        fix: "Align selectors exactly; for route-based peers use matching quick-mode selectors.",
      },
      {
        description: "Rekey race after lifetime change or auto-neg misconfig",
        verify: "`diag vpn tunnel list` (bound/dev status), event timing vs lifetime.",
        fix: "Align lifetimes, enable auto-negotiate on the responder only, and let the initiator drive rekey.",
      },
    ],
  },
  {
    title: "Cisco: Port security violation",
    pattern: "psecure_violation",
    patternType: "exact",
    vendor: "cisco",
    meaning:
      "Port security detected more MAC addresses (or a disallowed MAC) than permitted on the interface and applied the violation action (restrict/shutdown).",
    causes: [
      {
        description: "Unauthorized switch/hub/AP connected to an access port",
        verify: "`show port-security interface <if>`, `show mac address-table interface <if>`",
        fix: "Remove the rogue device; re-enable with `shutdown` / `no shutdown` if err-disabled.",
      },
      {
        description: "Sticky MAC aging / maximum count too low for legit devices (docked laptops, phones+PC)",
        verify: "`show port-security address` vs expected device count.",
        fix: "Raise `switchport port-security maximum`, configure voice VLAN correctly, enable aging.",
      },
    ],
  },
  {
    title: "Cisco: BPDU guard blocked port",
    pattern: "block_bpduguard",
    patternType: "exact",
    vendor: "cisco",
    meaning:
      "A BPDU was received on a port with BPDU guard enabled (typically a PortFast edge port), so the port was put into err-disabled state.",
    causes: [
      {
        description: "User connected an unauthorized switch or extender sending BPDUs",
        verify: "`show interfaces status | include err-disabled`, `show spanning-tree summary totals`",
        fix: "Remove the device; recover with errdisable recovery or shutdown/no shutdown.",
      },
      {
        description: "PortFast/BPDU guard enabled on an uplink by mistake",
        verify: "`show spanning-tree interface <if> detail`",
        fix: "Remove PortFast and BPDU guard from uplink/trunk ports.",
      },
    ],
  },
  {
    title: "Check Point: Quick Mode selectors mismatch",
    pattern: "identifiers do not match",
    patternType: "regex",
    vendor: "checkpoint",
    meaning:
      "Check Point IKE error: the phase 2 IDs (encryption domain / selectors) offered by the peer do not match any entry in the local IPsec community or traditional mode satellite config.",
    causes: [
      {
        description: "Encryption domains differ between gateways (one side more specific or broader)",
        verify: "`vpn export_tables`, SmartView IKE/elg debug, compare encryption domain on both peers.",
        fix: "Mirror the encryption domains; for interoperability use exactly matching subnets.",
      },
      {
        description: "Peer behind NAT proposing private IDs",
        verify: "Check `link selection` / NAT traversal settings in the gateway object.",
        fix: "Enable NAT-T, fix link selection to use the correct external IP.",
      },
    ],
  },
  {
    title: "Juniper: IKE negotiation failed",
    pattern: "ike negotiation failed",
    patternType: "exact",
    vendor: "juniper",
    meaning:
      "Junos iked/ke reported a failed IKE negotiation. Usually accompanied by a reason string (no proposal chosen, authentication failed, phase 2 mismatch...).",
    causes: [
      {
        description: "Proposal or PSK mismatch with peer",
        verify: "`show log kmd` / traceoptions: `show security ike traceoptions`, `request security ike debug-refresh`",
        fix: "Align ike proposal and pre-shared-key; verify external-interface binding.",
      },
      {
        description: "Wrong external-interface / local-address on the st0 gateway",
        verify: "`show configuration security ike gateway`, `show interfaces st0`",
        fix: "Bind the gateway to the correct egress interface and re-establish.",
      },
      {
        description: "NAT-T mismatch or ESP blocked in path",
        verify: "`show security ike security-associations`, packet capture on st0/egress.",
        fix: "Enable NAT-T both sides; permit UDP 4500/500 and ESP on transit firewalls.",
      },
    ],
  },
];

export function seedIfEmpty(db: Database.Database): void {
  const hasVendors = db.prepare("SELECT COUNT(*) n FROM vendors").get() as { n: number };
  if (hasVendors.n > 0) return;

  const tx = db.transaction(() => {
    const insVendor = db.prepare("INSERT INTO vendors (name, slug, color) VALUES (?, ?, ?)");
    const vendorIds = new Map<string, number>();
    for (const v of VENDORS) {
      const r = insVendor.run(v.name, v.slug, v.color);
      vendorIds.set(v.slug, Number(r.lastInsertRowid));
    }

    const insTech = db.prepare("INSERT INTO technologies (name, category) VALUES (?, ?)");
    for (const [name, category] of TECHNOLOGIES) insTech.run(name, category);

    const insErr = db.prepare(
      "INSERT INTO error_kb (title, pattern, pattern_type, vendor_id, meaning) VALUES (?, ?, ?, ?, ?)"
    );
    const insCause = db.prepare(
      "INSERT INTO error_causes (error_id, description, verify, fix) VALUES (?, ?, ?, ?)"
    );
    for (const e of ERROR_SEEDS) {
      const vendorId = e.vendor ? (vendorIds.get(e.vendor) ?? null) : null;
      const r = insErr.run(e.title, e.pattern, e.patternType, vendorId, e.meaning);
      const id = Number(r.lastInsertRowid);
      for (const c of e.causes) insCause.run(id, c.description, c.verify, c.fix);
    }
  });
  tx();
}

type CmdRow = [vendor: string | null, command: string];

interface CommandSeed {
  task: string;
  category: string;
  notes?: string;
  cmds: CmdRow[];
}

const COMMAND_SEEDS: CommandSeed[] = [
  {
    task: "Interface status overview",
    category: "Interfaces",
    cmds: [
      ["cisco", "show ip interface brief"],
      ["juniper", "show interfaces terse"],
      ["fortigate", "get system interface physical"],
      ["paloalto", "show interface all"],
      ["checkpoint", "show interface all"],
    ],
  },
  {
    task: "Interface errors / counters",
    category: "Interfaces",
    cmds: [
      ["cisco", "show interfaces <if> | include error|CRC|reset"],
      ["juniper", "show interfaces <if> extensive | match \"error|input error|CRC\""],
      ["fortigate", "diagnose netlink interface list <if>"],
      ["paloalto", "show counter interface <if>"],
      ["checkpoint", "ethtool -S <if>   # expert mode"],
    ],
  },
  {
    task: "Routing table (all routes)",
    category: "Routing",
    cmds: [
      ["cisco", "show ip route"],
      ["juniper", "show route"],
      ["fortigate", "get router info routing-table all"],
      ["paloalto", "show routing route"],
      ["checkpoint", "ip route show   # expert mode"],
    ],
  },
  {
    task: "Route lookup for a destination",
    category: "Routing",
    cmds: [
      ["cisco", "show ip route <dst>"],
      ["juniper", "show route <dst>"],
      ["fortigate", "get router info routing-table details <dst>"],
      ["paloalto", "test routing fib-lookup virtual-router <vr> ip <dst>"],
      ["checkpoint", "ip route get <dst>   # expert mode"],
    ],
  },
  {
    task: "BGP neighbors summary",
    category: "BGP",
    cmds: [
      ["cisco", "show ip bgp summary"],
      ["juniper", "show bgp summary"],
      ["fortigate", "get router info bgp summary"],
      ["paloalto", "show routing protocol bgp peer"],
      ["checkpoint", "show bgp peers summary   # clish"],
    ],
  },
  {
    task: "BGP routes advertised to a peer",
    category: "BGP",
    cmds: [
      ["cisco", "show ip bgp neighbor <ip> advertised-routes"],
      ["juniper", "show route advertising-protocol bgp <ip>"],
      ["fortigate", "get router info bgp neighbors <ip> advertised-routes"],
      ["paloalto", "show routing protocol bgp peer <peer> advertised-routes"],
      ["checkpoint", "show bgp ribs vrf default   # clish"],
    ],
  },
  {
    task: "OSPF neighbors",
    category: "OSPF",
    cmds: [
      ["cisco", "show ip ospf neighbor"],
      ["juniper", "show ospf neighbor"],
      ["fortigate", "get router info ospf neighbor"],
      ["paloalto", "show routing protocol ospf neighbor"],
      ["checkpoint", "show ospf neighbors   # clish"],
    ],
  },
  {
    task: "IPsec tunnel status",
    category: "VPN",
    cmds: [
      ["cisco", "show crypto session brief"],
      ["juniper", "show security ike security-associations\nshow security ipsec security-associations"],
      ["fortigate", "diag vpn tunnel list"],
      ["paloalto", "show vpn ike-sa\nshow vpn ipsec-sa"],
      ["checkpoint", "vpn tu list   # interactive: option 1 (ike sa)"],
    ],
  },
  {
    task: "IKE debug capture (phase 1/2)",
    category: "VPN",
    notes: "Disable debugs when done — they are verbose and costly.",
    cmds: [
      ["cisco", "debug crypto condition peer <ip>\ndebug crypto isakmp\ndebug crypto ipsec"],
      ["juniper", "set security ike traceoptions flag all\nshow log kmd"],
      ["fortigate", "diag vpn ike log-filter name <tunnel>\ndiag debug application ike -1\ndiag debug enable"],
      ["paloalto", "test vpn ike-sa gateway <gw>   # plus GUI/pcap for full trace"],
      ["checkpoint", "vpn debug on; vpn debug trunc   # then read $FWDIR/log/ike.elg"],
    ],
  },
  {
    task: "Active sessions / connections by IP",
    category: "Sessions",
    cmds: [
      ["cisco", "show conn address <ip>   # ASA"],
      ["juniper", "show security flow session destination-prefix <ip>"],
      ["fortigate", "diagnose sys session filter dst <ip>\ndiagnose sys session list"],
      ["paloalto", "show session all filter destination <ip>"],
      ["checkpoint", "fw tab -t connections -s   # summary; fwaccel_conntab for accel"],
    ],
  },
  {
    task: "NAT translations / rules in effect",
    category: "NAT",
    cmds: [
      ["cisco", "show ip nat translations"],
      ["juniper", "show configuration security nat | display set"],
      ["fortigate", "show firewall vip\nshow firewall ippool"],
      ["paloalto", "show running nat-policy"],
      ["checkpoint", "fwaccel nat table   # expert; rules in SmartConsole"],
    ],
  },
  {
    task: "Policy hit counters",
    category: "Policy",
    cmds: [
      ["cisco", "show access-list <acl> | include hitcnt"],
      ["juniper", "show security policies hit-count"],
      ["fortigate", "diag firewall audit list   # policy match stats"],
      ["paloalto", "show rule-hit-count vsys vsys1 rule-base security rules"],
      ["checkpoint", "fwaccel stat   # + SmartView for per-rule counts"],
    ],
  },
  {
    task: "HA / cluster status",
    category: "HA",
    cmds: [
      ["cisco", "show failover   # ASA / show redundancy (IOS)"],
      ["juniper", "show chassis cluster status"],
      ["fortigate", "get system ha status"],
      ["paloalto", "show high-availability state"],
      ["checkpoint", "cphaprob state\ncphaprob -a if"],
    ],
  },
  {
    task: "CPU / memory utilization",
    category: "System",
    cmds: [
      ["cisco", "show processes cpu sorted\nshow memory statistics"],
      ["juniper", "show chassis routing-engine   # RE CPU/mem"],
      ["fortigate", "get system performance status"],
      ["paloalto", "show system resources   # top"],
      ["checkpoint", "cpstat os -f cpu\ncpstat os -f memory   # expert"],
    ],
  },
  {
    task: "ARP table",
    category: "L2 / ARP",
    cmds: [
      ["cisco", "show ip arp"],
      ["juniper", "show arp no-resolve"],
      ["fortigate", "get system arp"],
      ["paloalto", "show arp all"],
      ["checkpoint", "show arp   # clish / arp -an (expert)"],
    ],
  },
  {
    task: "Packet capture on the box",
    category: "Diagnostics",
    notes: "Always clear/disable captures after troubleshooting.",
    cmds: [
      ["cisco", "monitor capture <cap> interface <if> both match ip any any\nmonitor capture <cap> start   # IOS-XE"],
      ["juniper", "monitor traffic interface <if> no-resolve"],
      ["fortigate", "diagnose sniffer packet <if> \"host <ip>\" 4 0 l"],
      ["paloalto", "debug dataplane packet-diagram set filter match \"ip <ip>\"\nview-pcap filter-pcap <file>   # export via GUI"],
      ["checkpoint", "fw monitor -e \"accept host(<ip>);\" -o /var/log/fwmon.pcap   # expert"],
    ],
  },
  {
    task: "Follow logs live / recent logs",
    category: "Diagnostics",
    cmds: [
      ["cisco", "show logging | include <pattern>\nterminal monitor   # live console"],
      ["juniper", "show log messages | last 50\nmonitor start messages   # live"],
      ["fortigate", "execute log filter device disk\nexecute log display   # + diag debug flow"],
      ["paloalto", "show log system direction equal backward equal last 50\nless mp-log panic.log   # expert files"],
      ["checkpoint", "fw log -ft   # expert, tail firewall log"],
    ],
  },
];

export function seedCommandsIfEmpty(db: Database.Database): void {
  const hasRefs = db.prepare("SELECT COUNT(*) n FROM command_refs").get() as { n: number };
  if (hasRefs.n > 0) return;

  const tx = db.transaction(() => {
    const vendorIds = new Map<string, number>();
    const rows = db.prepare("SELECT id, slug FROM vendors").all() as { id: number; slug: string }[];
    for (const r of rows) vendorIds.set(r.slug, r.id);
    if (vendorIds.size === 0) return;

    const insRef = db.prepare("INSERT INTO command_refs (task, category, notes) VALUES (?, ?, ?)");
    const insEntry = db.prepare("INSERT INTO command_entries (ref_id, vendor_id, command) VALUES (?, ?, ?)");
    for (const s of COMMAND_SEEDS) {
      const r = insRef.run(s.task, s.category, s.notes ?? "");
      const refId = Number(r.lastInsertRowid);
      for (const [slug, command] of s.cmds) {
        const vendorId = slug ? vendorIds.get(slug) : undefined;
        if (vendorId) insEntry.run(refId, vendorId, command);
      }
    }
  });
  tx();
}

interface StepSeed {
  kind: "action" | "question" | "note";
  text: string;
  checks?: [string, string][]; // [vendor slug, command]
  branches?: [string, number | "next"][]; // [label, target step number or next]
}

interface PlaybookSeed {
  title: string;
  category: string;
  description: string;
  steps: StepSeed[];
}

const PLAYBOOK_SEEDS: PlaybookSeed[] = [
  {
    title: "Site-to-site IPsec VPN tunnel down",
    category: "VPN",
    description:
      "Linear checklist for a site-to-site tunnel that will not establish or pass traffic. Jumps point to the section that matches your answer. Register the outcome as a case when done.",
    steps: [
      {
        kind: "question",
        text: "Is the peer reachable at layer 3 (ping to peer public IP from the WAN interface)?",
        checks: [
          ["cisco", "ping <peer-ip> source <wan-if> repeat 5"],
          ["juniper", "ping <peer-ip> source <wan-ip> rapid count 5"],
          ["fortigate", "execute ping-options source <wan-ip>\nexecute ping <peer-ip>"],
          ["paloalto", "test connectivity host <peer-ip> from <src-zone>"],
          ["checkpoint", "ping <peer-ip>   # expert mode"],
        ],
        branches: [
          ["No — go to routing/L3 checks", 7],
          ["Yes — continue", "next"],
        ],
      },
      {
        kind: "question",
        text: "Is IKE phase 1 (IKE_SA / ISAKMP SA) established?",
        checks: [
          ["cisco", "show crypto isakmp sa detail"],
          ["juniper", "show security ike security-associations"],
          ["fortigate", "diag vpn ike gateway list"],
          ["paloalto", "show vpn ike-sa"],
          ["checkpoint", "vpn tu list   # option 1"],
        ],
        branches: [
          ["No — phase 1 problem", 3],
          ["Yes — go to phase 2", 5],
        ],
      },
      {
        kind: "action",
        text: "Enable IKE debug filtered to this peer and read the failure reason. Cross-check matched patterns in the Log Analyzer (No proposal chosen, AUTHENTICATION_FAILED, invalid SPI).",
        checks: [
          ["cisco", "debug crypto condition peer <peer-ip>\ndebug crypto isakmp"],
          ["fortigate", "diag vpn ike log-filter dst-addr4 <peer-ip>\ndiag debug application ike -1\ndiag debug enable"],
          ["juniper", "show log kmd | last 100"],
        ],
      },
      {
        kind: "question",
        text: "Did phase 1 come up after aligning proposals / PSK / peer-ID?",
        branches: [
          ["Yes — go to phase 2", 5],
          ["No — escalate", 8],
        ],
      },
      {
        kind: "question",
        text: "Is phase 2 (IPsec SA) installed with matching traffic selectors?",
        checks: [
          ["cisco", "show crypto ipsec sa peer <peer-ip> | include local ident|remote ident|pkts"],
          ["juniper", "show security ipsec security-associations detail"],
          ["fortigate", "diag vpn tunnel list"],
          ["paloalto", "show vpn ipsec-sa"],
          ["checkpoint", "vpn tu list   # option 5 (IPsec SA)"],
        ],
        branches: [
          ["No — selectors/proposal mismatch", 6],
          ["Yes — go to routing/policy", 7],
        ],
      },
      {
        kind: "action",
        text: "Compare phase 2 proposals (encryption, hash, PFS/DH group, lifetime) and quick-mode selectors on both peers. For route-based peers confirm the st0/tunnel interface binding.",
      },
      {
        kind: "action",
        text: "Verify routing towards the remote subnets via the tunnel and firewall policy allowing the traffic in BOTH directions (including return path on the peer).",
        checks: [
          ["fortigate", "get router info routing-table details <remote-subnet>\ndiagnose firewall proute list"],
          ["juniper", "show route <remote-subnet>"],
          ["cisco", "show ip route <remote-subnet>"],
        ],
      },
      {
        kind: "note",
        text: "Escalate: collect phase 1/2 configs and debugs from both peers, then open a vendor TAC case. Register everything in a NetCortex case for future pattern ranking.",
      },
    ],
  },
  {
    title: "BGP neighbor down / flapping",
    category: "BGP",
    description:
      "Checklist for a BGP session stuck in Idle/Active, or established sessions that keep resetting with notifications.",
    steps: [
      {
        kind: "question",
        text: "What state is the neighbor in?",
        checks: [
          ["cisco", "show ip bgp summary"],
          ["juniper", "show bgp summary"],
          ["fortigate", "get router info bgp summary"],
          ["paloalto", "show routing protocol bgp peer"],
        ],
        branches: [
          ["Idle — go to config checks", 4],
          ["Active/Connect — go to TCP checks", 2],
          ["Established but flapping — go to notifications", 5],
        ],
      },
      {
        kind: "action",
        text: "Verify TCP 179 reachability in both directions and any ACL/firewall in the path (transit devices included).",
        checks: [
          ["cisco", "telnet <peer-ip> 179 /source Loopback0\nshow ip bgp neighbors | include Last reset"],
          ["juniper", "show bgp neighbor detail | match Last\ntraceroute <peer-ip>"],
        ],
      },
      {
        kind: "question",
        text: "Does the TCP connection to port 179 succeed?",
        branches: [
          ["Yes — go to notifications", 5],
          ["No — fix transport/ACL, then re-check", 1],
        ],
      },
      {
        kind: "action",
        text: "Idle usually means config or memory: verify remote-AS, peering addresses (update-source / local-address), ebgp-multihop/ttl, and MD5 password matching on both peers.",
        checks: [
          ["cisco", "show run | section router bgp"],
          ["juniper", "show configuration protocols bgp | display set"],
        ],
      },
      {
        kind: "action",
        text: "Flapping: decode the BGP NOTIFICATION (hold time expired vs malformed update vs CEASE). Check MTU along the path, CPU on both routers, and MD5. Log Analyzer has the NOTIFICATION pattern linked to causes.",
        checks: [
          ["cisco", "show logging | include %BGP\ndebug ip bgp keepalives"],
          ["juniper", "show log messages | match NOTIFICATION"],
        ],
      },
      {
        kind: "note",
        text: "If a prefix is accepted but not advertised, check outbound policy/distribute-list and the peer's inbound policy. Register the final root cause as a case.",
      },
    ],
  },
];

export function seedPlaybooksIfEmpty(db: Database.Database): void {
  const has = db.prepare("SELECT COUNT(*) n FROM playbooks").get() as { n: number };
  if (has.n > 0) return;

  const tx = db.transaction(() => {
    const vendorIds = new Map<string, number>();
    const rows = db.prepare("SELECT id, slug FROM vendors").all() as { id: number; slug: string }[];
    for (const r of rows) vendorIds.set(r.slug, r.id);
    if (vendorIds.size === 0) return;

    const insPb = db.prepare("INSERT INTO playbooks (title, category, description) VALUES (?, ?, ?)");
    const insStep = db.prepare(
      "INSERT INTO playbook_steps (playbook_id, position, kind, text, checks, branches) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const p of PLAYBOOK_SEEDS) {
      const r = insPb.run(p.title, p.category, p.description);
      const pbId = Number(r.lastInsertRowid);
      p.steps.forEach((s, i) => {
        const checks = JSON.stringify(
          (s.checks ?? [])
            .map(([slug, command]) => ({ vendor_id: vendorIds.get(slug) ?? null, command }))
            .filter((c) => c.vendor_id != null)
        );
        const branches = JSON.stringify(
          (s.branches ?? []).map(([label, target]) => ({ label, target }))
        );
        insStep.run(pbId, i + 1, s.kind, s.text, checks, branches);
      });
    }
  });
  tx();
}
