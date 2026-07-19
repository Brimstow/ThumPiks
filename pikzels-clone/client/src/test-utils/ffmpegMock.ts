export class FFmpeg {
  loaded = false;
  load = jest.fn().mockResolvedValue(undefined);
  writeFile = jest.fn().mockResolvedValue(undefined);
  readFile = jest.fn().mockResolvedValue(new Uint8Array());
  deleteFile = jest.fn().mockResolvedValue(undefined);
  exec = jest.fn().mockResolvedValue(0);
  on = jest.fn();
  off = jest.fn();
  terminate = jest.fn();
}
