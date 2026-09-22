/*
 * Shared modules for processing diabetes device data into the Tidepool data
 * model, extracted from the Tidepool Uploader (https://github.com/tidepool-org/uploader).
 * Each module can also be required individually, e.g. require('@tidepool/uploader-common/struct').
 */
module.exports = {
  struct: require('./struct'),
  TimezoneOffsetUtil: require('./TimezoneOffsetUtil'),
  eventAnnotations: require('./eventAnnotations'),
  commonFunctions: require('./commonFunctions'),
  objectBuilder: require('./objectBuilder'),
  crc: require('./crc'),
};
