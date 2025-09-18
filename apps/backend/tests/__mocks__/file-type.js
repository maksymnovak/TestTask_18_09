// Mock for file-type module
module.exports = {
  fileTypeFromBuffer: async (buffer) => {
    // Mock implementation - detect type based on file signature
    if (!buffer || buffer.length === 0) {
      return null;
    }

    // Basic PDF detection
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return {
        ext: 'pdf',
        mime: 'application/pdf'
      };
    }

    // Basic PNG detection
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return {
        ext: 'png',
        mime: 'image/png'
      };
    }

    // Basic JPEG detection
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return {
        ext: 'jpg',
        mime: 'image/jpeg'
      };
    }

    // Default to PDF for tests
    return {
      ext: 'pdf',
      mime: 'application/pdf'
    };
  }
};