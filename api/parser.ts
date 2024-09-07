import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import ical, { VEvent } from 'ical';
import moment from 'moment';

// Define the type for the event we expect from ical for Typescript
interface ICalEvent {
  type: string;
  start: Date;
}

// Helper function to filter events based on date
function filterEvents(events: Record<string, ICalEvent>, fromDate: moment.Moment, endDate: moment.Moment | null) {
  const today = moment().startOf('day');
  return Object.values(events).filter((event: ICalEvent) => {
    if (event.type === 'VEVENT') {
      const eventStart = moment(event.start);
      return eventStart.isSameOrAfter(today) && (!endDate || eventStart.isBetween(fromDate, endDate, 'days', '[]'));
    }
    return false;
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  
  // Make sure we handle both string and string[] types for uri
  const icsUri = Array.isArray(req.query.uri) ? req.query.uri[0] : req.query.uri;
  const fromDate = req.query.fromdate ? moment(req.query.fromdate, 'YYYY-MM-DD') : moment();
  const endDate = req.query.enddate ? moment(req.query.enddate, 'YYYY-MM-DD') : null;

  if (!icsUri) {
    return res.status(400).json({ error: 'ICS URI is required' });
  }

  try {
    // Fetch
    const response = await fetch(icsUri as string);
    const icsText = await response.text();

    // Parse
    const events = ical.parseICS(icsText);

    // Filter the events based on fromDate and endDate
    const filteredEvents = filterEvents(events as Record<string, ICalEvent>, fromDate, endDate);

    return res.json({
      events: filteredEvents,
    });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch or process ICS data', details: error.message });
  }
}
