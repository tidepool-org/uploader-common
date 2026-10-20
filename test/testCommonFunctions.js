/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2015, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */


var expect = require('salinity').expect;

var builder = require('../objectBuilder')();


var common = require('../commonFunctions');
var annotate = require('../eventAnnotations');

describe('commonFunctions.js', () => {

  describe('finalScheduledBasal', () => {

    var basal;
    beforeEach(() => {
      basal = builder.makeScheduledBasal()
        .with_deviceTime('2015-11-05T17:36:39')
        .with_time('2015-11-05T17:36:39.000Z')
        .with_rate(0.3)
        .with_scheduleName('Test')
        .with_conversionOffset(0)
        .with_timezoneOffset(0);
    });

    test('fabricates final basal duration from two schedule segments', () => {
      var settings = {
        basalSchedules: {
          'Test': [
            {
              rate: 0.3,
              start: 0
            },
            {
              rate: 0.5,
              start: 63400000
            }
          ]
        }
      };
      var finalBasal = common.finalScheduledBasal(basal, settings, 'test');
      expect(finalBasal.annotations[0].code).to.equal('final-basal/fabricated-from-schedule');
      expect(finalBasal.duration).to.equal(1000);
    });

    test('fabricates final basal duration from only one schedule segment', () => {
      var settings = {
        basalSchedules: {
          'Test': [
            {
              rate: 0.3,
              start: 0
            }
          ]
        }
      };
      var finalBasal = common.finalScheduledBasal(basal, settings, 'test');
      expect(finalBasal.annotations[0].code).to.equal('final-basal/fabricated-from-schedule');
      expect(finalBasal.duration).to.equal(23001000); // 864e5 - millisInDay
    });

    test('final basal has zero duration when it has an off-schedule rate', () => {
      var settings = {
        basalSchedules: {
          'Test': [
            {
              rate: 0.5,
              start: 0
            }
          ]
        }
      };
      var finalBasal = common.finalScheduledBasal(basal, settings, 'test');
      // TODO: to make the following test more robust, consider using chai-things (new dependency)
      // that supports assertions on array elements, e.g.:
      // finalBasal.annotations.should.include.something.that.deep.equals({code : 'basal/unknown-duration'});
      expect(finalBasal.annotations[0].code).to.equal('test/basal/off-schedule-rate');
      expect(finalBasal.annotations[1].code).to.equal('basal/unknown-duration');
      expect(finalBasal.duration).to.equal(0);
    });

    test('final basal has zero duration if no schedule and duration found', () => {
      var settings = {
        basalSchedules: {
          'NotTest': [
            {
              rate: 0.3,
              start: 0
            }
          ]
        }
      };
      var finalBasal = common.finalScheduledBasal(basal, settings, 'test');
      expect(finalBasal.annotations[0].code).to.equal('basal/unknown-duration');
      expect(finalBasal.duration).to.equal(0);
    });
  });

  describe('computeMillisInCurrentDay', () => {

    var basal;
    beforeEach(() => {
      basal = builder.makeScheduledBasal()
        .with_deviceTime('2015-11-05T17:00:00')
        .with_time('2015-11-05T17:00:00.000Z')
        .with_rate(0.3)
        .with_scheduleName('Test')
        .with_conversionOffset(0)
        .with_timezoneOffset(0);
    });

    test('returns milliseconds in current day', () => {
      expect(common.computeMillisInCurrentDay(basal)).to.equal(61200000);
    });

    test('rounds to nearest 15 minutes for clock skew', () => {
      basal.with_time('2015-11-05T17:05:00.000Z')
        .with_conversionOffset(420000);
      expect(common.computeMillisInCurrentDay(basal)).to.equal(61200000);
    });
  });

  describe('stripUnwantedFields', () => {
    const record = {
      _deduplicator: {
        hash: 'ABCD'
      },
      annotations: [
        {
          code: 'basal/unknown-duration'
        }
      ],
      clockDriftOffset: -257000,
      conversionOffset: 0,
      deliveryType: 'suspend',
      deviceId: 'tandemCIQ1234',
      deviceTime: '2024-10-17T16:53:54',
      guid: '1234',
      id: '5678',
      payload: {
        logIndices: [
          282622
        ],
      },
      time: '2024-10-17T15:53:54Z',
      timezoneOffset: 60,
      type: 'basal',
      uploadId: 'upid_1234'
    };

    test('removes unwanted fields', () => {
      expect(common.stripUnwantedFields(record)).to.deep.equal({
        annotations: [
            {
                code: 'basal/unknown-duration'
            }
        ],
        clockDriftOffset: -257000,
        conversionOffset: 0,
        deliveryType: 'suspend',
        deviceId: 'tandemCIQ1234',
        deviceTime: '2024-10-17T16:53:54',
        payload: {
            logIndices: [
                282622
            ],
        },
        time: '2024-10-17T15:53:54Z',
        timezoneOffset: 60,
        type: 'basal'
      });
    });
  });

  describe('toFixedNumber', () => {
    test('to 5 digits', () => {
      const value = (1.12345678).toFixedNumber(5);
      expect(value).to.equal(1.12346);
    });
  });

  describe('updateDuration', () => {
    const lastBasal = builder.makeScheduledBasal()
      .with_deviceTime('2015-11-05T17:00:00')
      .with_time('2015-11-05T17:00:00.000Z')
      .with_rate(0.3)
      .with_duration(0)
      .with_scheduleName('Test')
      .with_conversionOffset(0)
      .with_timezoneOffset(0)
      .done();
    annotate.annotateEvent(lastBasal, 'basal/unknown-duration');

    const basal = builder.makeScheduledBasal()
      .with_deviceTime('2015-11-05T17:30:00')
      .with_time('2015-11-05T17:30:00.000Z')
      .with_rate(0.6)
      .with_duration(15000)
      .with_scheduleName('Test2')
      .with_conversionOffset(0)
      .with_timezoneOffset(0)
      .done();

    test('updates previous duration and removes annotations', () => {
      const updatedBasal = common.updateDuration(basal, lastBasal);
      expect(updatedBasal.duration).to.equal(1800000);
      expect(updatedBasal.annotations).to.be.undefined;
    });

    const scheduledBasal = (time, duration) => builder.makeScheduledBasal()
      .with_deviceTime(time.slice(0, 19))
      .with_time(time)
      .with_rate(0.3)
      .with_duration(duration)
      .with_scheduleName('Test')
      .with_conversionOffset(0)
      .with_timezoneOffset(0)
      .done();

    test('keeps the planned duration as expectedDuration when the next event cuts the previous one short', () => {
      const previous = scheduledBasal('2026-10-15T08:04:55.000Z', 3600000);
      const updatedBasal = common.updateDuration(scheduledBasal('2026-10-15T08:34:55.000Z', 1800000), previous);
      expect(updatedBasal.duration).to.equal(1800000);
      expect(updatedBasal.expectedDuration).to.equal(3600000);
    });

    test('sets no expectedDuration when the next event extends a basal fabricated to its schedule boundary', () => {
      const previous = scheduledBasal('2026-10-15T08:04:55.000Z', 3305000);
      annotate.annotateEvent(previous, 'final-basal/fabricated-from-schedule');
      const updatedBasal = common.updateDuration(scheduledBasal('2026-10-15T09:05:00.000Z', 6005000), previous);
      expect(updatedBasal.duration).to.equal(3605000);
      expect(updatedBasal.expectedDuration).to.be.undefined;
      expect(updatedBasal.annotations).to.be.undefined;
    });

    test('drops an expectedDuration the extended duration reaches', () => {
      const previous = scheduledBasal('2026-10-15T08:04:55.000Z', 1000000);
      previous.expectedDuration = 1500000;
      const updatedBasal = common.updateDuration(scheduledBasal('2026-10-15T08:34:55.000Z', 1800000), previous);
      expect(updatedBasal.duration).to.equal(1800000);
      expect(updatedBasal.expectedDuration).to.be.undefined;
    });
  });

  describe('updatePreviousDurations', () => {
    const latestBasal = {
      id: 'basal-id', uploadId: 'upid_1234', type: 'basal', deliveryType: 'suspend',
      time: '2026-09-16T18:00:00.000Z', duration: 0, annotations: [{ code: 'basal/unknown-duration' }],
    };
    // a suspended status still waiting for its resume, as when the previous upload ended while the pump was suspended
    const pendingStatus = {
      id: 'status-id', uploadId: 'upid_1234', type: 'deviceEvent', subType: 'status', status: 'suspended',
      time: '2026-09-16T18:00:00.000Z', duration: 0, reason: { suspended: 'manual' }, payload: { reason: 'User aborted' },
      annotations: [{ code: 'status/incomplete-tuple' }],
    };
    const resume = { type: 'deviceEvent', subType: 'status', status: 'resumed', time: '2026-09-16T18:15:00.000Z', reason: { resumed: 'manual' } };
    const basal = { type: 'basal', deliveryType: 'scheduled', time: '2026-09-16T18:15:00.000Z', duration: 3600000 };

    const updatePreviousDurations = ({ keepUpdatedRecordIds, latestRecords, postRecords = [resume, basal] }) => {
      const cfg = {
        groupId: 'group',
        deviceInfo: { deviceId: 'tandemCIQ1234' },
        keepUpdatedRecordIds,
        api: {
          getLatestRecord: async (groupId, deviceId, type, subType) => {
            const record = latestRecords[subType ? `${type}/${subType}` : type];
            return record ? structuredClone(record) : null;
          },
        },
      };
      const data = { post_records: structuredClone(postRecords) };
      return new Promise((resolve, reject) => {
        common.updatePreviousDurations(data, cfg, (err, result) => (err ? reject(err) : resolve(result.post_records)));
      });
    };

    const summary = (records) => records.map((record) => [record.type, record.status || record.deliveryType, record.duration]);

    test('updates the latest basal and merges the resume into the latest suspended status, without their ids', async () => {
      const records = await updatePreviousDurations({ latestRecords: { basal: latestBasal, 'deviceEvent/status': pendingStatus } });
      expect(records.map((record) => [record.type, record.status || record.deliveryType, record.duration, record.id])).to.deep.equal([
        ['basal', 'scheduled', 3600000, undefined],
        ['basal', 'suspend', 900000, undefined],
        ['deviceEvent', 'suspended', 900000, undefined],
      ]);
      expect(records[2].reason).to.deep.equal({ suspended: 'manual', resumed: 'manual' });
      expect(records[2].payload).to.deep.equal({ suspended: 'User aborted' });
      expect(records[2].annotations).to.be.undefined;
    });

    test('updates the latest suspend basal when there is no latest status', async () => {
      const records = await updatePreviousDurations({ latestRecords: { basal: latestBasal } });
      expect(summary(records)).to.deep.equal([
        ['deviceEvent', 'resumed', undefined],
        ['basal', 'scheduled', 3600000],
        ['basal', 'suspend', 900000],
      ]);
    });

    test('merges the resume into the latest suspended status whatever the latest basal is', async () => {
      // the basal that says the pump is suspended comes minutes after the suspend, and the resume can come before it
      const scheduledBasal = { ...latestBasal, deliveryType: 'scheduled', rate: 0.5 };
      const records = await updatePreviousDurations({ latestRecords: { basal: scheduledBasal, 'deviceEvent/status': pendingStatus } });
      expect(summary(records)).to.deep.equal([
        ['basal', 'scheduled', 3600000],
        ['basal', 'scheduled', 900000],
        ['deviceEvent', 'suspended', 900000],
      ]);
      expect(records[2].reason).to.deep.equal({ suspended: 'manual', resumed: 'manual' });
      expect(records[2].annotations).to.be.undefined;
    });

    test('keeps the resume when the latest suspended status has its resume', async () => {
      const completeStatus = { ...pendingStatus, duration: 600000, reason: { suspended: 'manual', resumed: 'manual' } };
      delete completeStatus.annotations;
      const records = await updatePreviousDurations({ latestRecords: { basal: latestBasal, 'deviceEvent/status': completeStatus } });
      expect(summary(records)).to.deep.equal([
        ['deviceEvent', 'resumed', undefined],
        ['basal', 'scheduled', 3600000],
        ['basal', 'suspend', 900000],
      ]);
    });

    test('keeps the resume when the latest status is a resume', async () => {
      const latestResume = { ...resume, id: 'resume-id', time: '2026-09-16T17:00:00.000Z', annotations: [{ code: 'status/incomplete-tuple' }] };
      const records = await updatePreviousDurations({ latestRecords: { basal: latestBasal, 'deviceEvent/status': latestResume } });
      expect(summary(records)).to.deep.equal([
        ['deviceEvent', 'resumed', undefined],
        ['basal', 'scheduled', 3600000],
        ['basal', 'suspend', 900000],
      ]);
    });

    test('merges the first resume, not a suspended status, into the latest suspended status', async () => {
      // a suspend and resume of this upload, before the resume of the latest suspended status
      const completeStatus = {
        type: 'deviceEvent', subType: 'status', status: 'suspended', time: '2026-09-16T18:05:00.000Z', duration: 300000,
        reason: { suspended: 'manual', resumed: 'manual' },
      };
      const records = await updatePreviousDurations({
        latestRecords: { basal: latestBasal, 'deviceEvent/status': pendingStatus },
        postRecords: [completeStatus, resume, basal],
      });
      expect(summary(records)).to.deep.equal([
        ['deviceEvent', 'suspended', 300000],
        ['basal', 'scheduled', 3600000],
        ['basal', 'suspend', 900000],
        ['deviceEvent', 'suspended', 900000],
      ]);
      expect(records[0]).to.deep.equal(completeStatus);
      expect(records[3].time).to.equal('2026-09-16T18:00:00.000Z');
    });

    test('keeps the ids of the records it updates with keepUpdatedRecordIds', async () => {
      const records = await updatePreviousDurations({ keepUpdatedRecordIds: true, latestRecords: { basal: latestBasal, 'deviceEvent/status': pendingStatus } });
      expect(records.map((record) => [record.type, record.id, record.uploadId])).to.deep.equal([
        ['basal', undefined, undefined],
        ['basal', 'basal-id', undefined],
        ['deviceEvent', 'status-id', undefined],
      ]);
    });
  });
});
