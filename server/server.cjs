const { startServer } = require('./server');

let runtime;
let shuttingDown = false;

const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    if (runtime) await runtime.close();
  } catch (error) {
    console.error('Nie udało się poprawnie zatrzymać serwera LongDrive:', error);
    process.exitCode = 1;
  }
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

startServer()
  .then((startedRuntime) => {
    runtime = startedRuntime;
  })
  .catch((error) => {
    console.error('Nie udało się uruchomić serwera LongDrive:', error);
    process.exitCode = 1;
  });
