/**
 * Descricao unica dos servicos do SUT, reaproveitada pelos scripts de
 * inicializacao, health check e diagnostico.
 */
const BASE_HOST = process.env.SUT_HOST || 'localhost';

/** Servicos de API, com o endpoint de health exposto pelo Spring Actuator. */
const API_SERVICES = [
  { name: 'auth', port: 3004, health: '/auth/actuator/health', dbPort: 9091 },
  { name: 'booking', port: 3000, health: '/booking/actuator/health', dbPort: 9090 },
  { name: 'room', port: 3001, health: '/room/actuator/health', dbPort: 9094 },
  { name: 'branding', port: 3002, health: '/branding/actuator/health', dbPort: 9092 },
  { name: 'message', port: 3006, health: '/message/actuator/health', dbPort: 9093 },
  { name: 'report', port: 3005, health: '/report/actuator/health', dbPort: null },
];

/** Frontend Next.js, que tambem faz proxy de /api/* para os servicos acima. */
const FRONTEND = { name: 'assets', port: 8080, health: '/' };

const ALL_SERVICES = [...API_SERVICES, FRONTEND];

function healthUrl(service) {
  return `http://${BASE_HOST}:${service.port}${service.health}`;
}

module.exports = { API_SERVICES, FRONTEND, ALL_SERVICES, BASE_HOST, healthUrl };
