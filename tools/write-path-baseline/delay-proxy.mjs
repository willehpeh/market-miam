// A TCP proxy that holds every chunk for a fixed one-way delay before passing it on,
// in each direction — a stand-in for the network round trip between an API instance
// and managed Postgres, where a local run has almost none. Runs as its own process so
// its timing loop doesn't share an event loop with the writers it delays.
//
//   node delay-proxy.mjs <listenPort> <targetHost> <targetPort> <oneWayMs>
//
// setTimeout can't wait less than a millisecond, so the last stretch before a chunk
// falls due is spun out with setImmediate: sub-millisecond delays stay honest, at the
// cost of a busy core while traffic is in flight.
import net from 'node:net';
import { performance } from 'node:perf_hooks';

const [listenPort, targetHost, targetPort, oneWayMs] = process.argv.slice(2);
const delay = Number(oneWayMs);

function delayed(from, to) {
  const queue = [];
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    const now = performance.now();
    while (queue.length > 0 && queue[0].due <= now) {
      to.write(queue.shift().chunk);
    }
    if (queue.length > 0) {
      schedule(queue[0].due - now);
    }
  };
  const schedule = (wait) => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    if (wait > 2) {
      setTimeout(flush, wait - 1.5);
    } else {
      setImmediate(flush);
    }
  };
  from.on('data', (chunk) => {
    queue.push({ due: performance.now() + delay, chunk });
    schedule(delay);
  });
}

const server = net.createServer((client) => {
  const upstream = net.connect(Number(targetPort), targetHost);
  client.setNoDelay(true);
  upstream.setNoDelay(true);
  delayed(client, upstream);
  delayed(upstream, client);
  const close = () => {
    client.destroy();
    upstream.destroy();
  };
  client.on('close', close).on('error', close);
  upstream.on('close', close).on('error', close);
});

server.listen(Number(listenPort), '127.0.0.1', () => process.send?.('ready'));
