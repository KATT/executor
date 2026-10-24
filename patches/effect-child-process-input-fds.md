# Child process input descriptors

Effect 4.0.6 keeps an `error` listener on each extra input descriptor
(`additionalFds` with `type: "input"`) until the child closes, in
`NodeChildProcessSpawner.handleInputErrors`. The 4.0.1 patch that did this
is gone.

Node opens every extra descriptor as a duplex socket and reads from it, even
one the parent only writes to. On Linux these are Unix socket pairs: a child
that exits, or is killed, without reading all of its input resets the socket,
and the parent's read fails with `ECONNRESET`. The release's sink listens for
`error` only while it writes, so that later error has no listener and becomes
an uncaught exception. In the desktop's Electron main process this opened a
native error dialog and stopped the app whenever a backend exited before
reading its fd3 bootstrap, for example after a refused key setup.

Errors during a write still reach the sink and fail it. An error after the
write has finished carries nothing to act on; the child's exit is observed
through its exit code. Output descriptors already keep a listener for their
whole lifetime.

4.0.6's `handleInputErrors` is that listener, so nothing in
`patchedDependencies` covers this anymore.
