const { HOME, DOCKER_SOCKET = '/var/run/docker.sock' } = process.env
module.exports = {
  Image: 'codekitchen/dinghy-http-proxy',
  name: 'http-proxy',
  Env: [
    'DNS_IP=127.0.0.1',
    'CONTAINER_NAME=http-proxy',
    'DOMAIN_TLD=dev'
  ],
  ExposedPorts: {
    '80/tcp': {},
    '443/tcp': {},
    '19322/udp': {}
  },
  HostConfig: {
    Binds: [
      `${DOCKER_SOCKET}:/tmp/docker.sock:ro`,
      `${HOME}/.dinghy/certs:/etc/nginx/certs`
    ],
    PortBindings: {
      '80/tcp': [{ 'HostPort': '80' }],
      '443/tcp': [{ 'HostPort': '443' }],
      '19322/udp': [{ 'HostPort': '19322' }]
    },
    RestartPolicy: {
      Name: 'always'
    }
  }
}
