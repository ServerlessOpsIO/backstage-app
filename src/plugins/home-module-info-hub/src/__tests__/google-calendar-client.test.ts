import { OAuthApi } from '@backstage/core-plugin-api';
import {
  GoogleCalendarClient,
  buildLocalDayWindow,
} from '../api/google-calendar-client';

function createAuthApiMock(): OAuthApi {
  return {
    getAccessToken: jest.fn().mockResolvedValue('google-token-123'),
  };
}

describe('GoogleCalendarClient', () => {
  test('builds a local-day query window and returns ready events', async () => {
    const now = new Date('2026-10-28T14:15:30.000Z');
    const queryWindow = buildLocalDayWindow(now);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'evt-1',
            summary: 'Engineering sync',
            start: { dateTime: '2026-10-28T15:00:00.000Z' },
            end: { dateTime: '2026-10-28T15:30:00.000Z' },
          },
        ],
      }),
    });

    const client = new GoogleCalendarClient(createAuthApiMock(), fetchMock as typeof fetch);
    const result = await client.getTodayEvents({ calendarId: 'primary', now });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get('timeMin')).toBe(queryWindow.timeMin.toISOString());
    expect(parsed.searchParams.get('timeMax')).toBe(queryWindow.timeMax.toISOString());
    expect(parsed.searchParams.get('singleEvents')).toBe('true');
    expect(parsed.searchParams.get('orderBy')).toBe('startTime');

    expect(result.status).toBe('ready');
  });

  test('returns unavailable state when google api response is unsuccessful', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const client = new GoogleCalendarClient(createAuthApiMock(), fetchMock as typeof fetch);
    const result = await client.getTodayEvents({
      calendarId: 'primary',
      now: new Date('2026-10-28T14:15:30.000Z'),
    });

    expect(result).toMatchObject({
      status: 'unavailable',
      message: expect.stringContaining('HTTP 503'),
    });
  });
});
