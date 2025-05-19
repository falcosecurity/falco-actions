export const outboundConnections: string[] = [
  'evt.type in (connect,sendto,sendmsg,sendmmsg)',
  'and evt.dir=<'
]
// todo(loresuso): improve outbound connections filter

export const outboundConnectionDetails: string[] = [
  '%fd.sip',
  '%fd.sport',
  '%proc.name',
  '%proc.exepath',
  '%user.name'
]

export const writtenFiles: string[] = [
  'evt.type in (open,openat,openat2)',
  'and evt.is_open_write=true',
  "and fd.typechar='f'",
  'and fd.num>=0'
]

export const writtenFileDetails: string[] = [
  '%fd.name',
  '%proc.name',
  '%proc.exepath',
  '%proc.pexepath',
  '%user.name'
]

export const processes: string[] = [
  'evt.type in (execve, execveat)',
  'and evt.dir=<',
  'and evt.arg.res=0'
]

export const processDetails: string[] = [
  '%proc.name',
  '%proc.exepath',
  '%proc.pname',
  '%proc.pexepath',
  '%user.name'
]

export const containers: string[] = ['evt.type = container']

export const containerDetails: string[] = [
  '%container.name',
  '%container.image.repository',
  '%container.id'
]

export const dnsDomains: string[] = [
  'evt.type in (recvmsg,read,recv,recvfrom)',
  'and fd.rport=53',
  'and fd.l4proto=udp'
]

export const dnsDomainDetails: string[] = ['%evt.buffer']

// todo(loresuso): hashes
