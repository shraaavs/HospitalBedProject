let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => {
  return ioInstance;
};

export const emitQueueEvent = (eventName, data) => {
  if (ioInstance) {
    try {
      ioInstance.emit(eventName, data);
    } catch (err) {
      console.error(`Error emitting socket event ${eventName}:`, err);
    }
  }
};
