import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCatalog,
  cleanLeagueTitle,
  cleanMinute,
  footballAlerts,
  footballStatus,
  followedMatches,
  mergeMatchDetail,
  parseLivescore,
  parseLeagues,
  parseMatchDetail,
  parseStanding,
  scoreLine,
  standingTabHref
} from '../src/shared/football.ts'
import type { FootballMatch } from '../src/shared/types.ts'

const NOW = Date.parse('2026-10-30T10:00:00Z')

function livescoreMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 497494,
    startOnUtc: '2026-10-29T13:15:00Z',
    time: '16:45',
    date: '7 آبان 1405',
    status: 0,
    statusTitle: '',
    isLive: false,
    liveTime: '',
    host: { id: 2, name: 'فجر سپاسی', logo: 'https://match-cdn.varzesh3.com/football-team/01630563.png' },
    guest: { id: 18, name: 'تراکتور', logo: 'https://match-cdn.varzesh3.com/football-team/0bi4mf3k.png' },
    ...overrides
  }
}

function slate(match: Record<string, unknown>, sport = 1) {
  return [
    {
      id: 6,
      title: 'لیگ برتر ایران - هفته 11',
      sport,
      dates: [{ date: '1405/08/07', matches: [match] }]
    }
  ]
}

function parsed(overrides: Record<string, unknown> = {}): FootballMatch {
  const [match] = parseLivescore(slate(livescoreMatch(overrides)))
  assert.ok(match)
  return match
}

test('league titles split into name and stage', () => {
  assert.deepEqual(cleanLeagueTitle('لیگ برتر ایران - هفته 11'), { league: 'لیگ برتر ایران', stage: 'هفته 11' })
  assert.deepEqual(cleanLeagueTitle('جام اتحادیه انگلیس - یک هشتم نهایی'), {
    league: 'جام اتحادیه انگلیس',
    stage: 'یک هشتم نهایی'
  })
  assert.deepEqual(cleanLeagueTitle('لیگ قهرمانان آسیا دو'), { league: 'لیگ قهرمانان آسیا دو', stage: '' })
})

test('provider status numbers map to the four states Qio draws', () => {
  assert.equal(footballStatus(2, false), 'live')
  assert.equal(footballStatus(1, true), 'live')
  assert.equal(footballStatus(0, false), 'scheduled')
  assert.equal(footballStatus(1, false), 'scheduled')
  assert.equal(footballStatus(7, false), 'finished')
  assert.equal(footballStatus(8, false), 'finished')
  assert.equal(footballStatus(4, false), 'postponed')
  assert.equal(footballStatus(5, false), 'canceled')
})

test('minutes keep added time but reject prose', () => {
  assert.equal(cleanMinute('45+2'), '45+2')
  assert.equal(cleanMinute("90+4'"), '90+4')
  assert.equal(cleanMinute('67'), '67')
  assert.equal(cleanMinute(''), null)
  assert.equal(cleanMinute('نیمه دوم'), null)
  assert.equal(cleanMinute('540'), null)
})

test('livescore parsing keeps football only and carries the real fixture data', () => {
  const raw = [
    {
      id: 6,
      title: 'لیگ برتر ایران - هفته 11',
      sport: 1,
      dates: [
        {
          date: '1405/08/07',
          matches: [
            livescoreMatch({ status: 7, statusTitle: 'نتیجه نهایی', goals: { host: 1, guest: 0 } }),
            livescoreMatch({ id: 497495, status: 0, startOnUtc: '2026-10-30T12:00:00Z' })
          ]
        }
      ]
    },
    {
      id: 32,
      title: 'لیگ برتر بسکتبال',
      sport: 4,
      dates: [{ date: '1405/08/07', matches: [livescoreMatch({ id: 181070 })] }]
    }
  ]
  const matches = parseLivescore(raw)
  assert.equal(matches.length, 2)
  assert.equal(matches[0].id, '497495')
  assert.equal(matches[0].status, 'scheduled')
  assert.equal(matches[1].status, 'finished')
  assert.equal(matches[1].host.score, 1)
  assert.equal(matches[1].guest.score, 0)
  assert.equal(matches[1].statusLabel, 'نتیجه نهایی')
  assert.equal(matches[1].clock, '16:45')
  assert.equal(matches[1].day, '7 آبان 1405')
  assert.equal(matches[1].kickoffAt, Date.parse('2026-10-29T13:15:00Z'))
  assert.deepEqual(matches[1].events, [])
  assert.equal(matches[0].league, 'لیگ برتر ایران')
  assert.equal(matches[0].leagueId, '6')
  assert.equal(matches[0].stage, 'هفته 11')
})

test('live matches sort ahead of scheduled and finished ones', () => {
  const all = parseLivescore([
    {
      id: 6,
      title: 'لیگ برتر ایران - هفته 11',
      sport: 1,
      dates: [
        { date: 'a', matches: [livescoreMatch({ id: 4, status: 7, goals: { host: 3, guest: 1 }, startOnUtc: '2026-10-30T08:00:00Z' })] },
        { date: 'b', matches: [livescoreMatch({ id: 2, status: 1, startOnUtc: '2026-10-30T19:00:00Z' })] },
        { date: 'c', matches: [livescoreMatch({ id: 1, status: 1, startOnUtc: '2026-10-30T12:00:00Z' })] },
        { date: 'd', matches: [livescoreMatch({ id: 3, status: 2, isLive: true, liveTime: '45+2', goals: { host: 1, guest: 1 } })] }
      ]
    }
  ])
  assert.deepEqual(all.map((match) => match.id), ['3', '1', '2', '4'])
  assert.equal(all[0].minute, '45+2')
  assert.equal(all[0].host.score, 1)
})

test('detail events keep provider minutes, sides, players and kinds', () => {
  const detail = parseMatchDetail({
    id: 496173,
    status: 7,
    statusTitle: 'نتیجه نهایی',
    date: '7 آبان 1405',
    time: '13:30',
    scheduledStartOnUtc: '2026-10-29T10:00:00Z',
    goals: { host: 1, guest: 0 },
    host: { id: 902844, name: 'گانگوان', logo: 'https://match-cdn.varzesh3.com/football-team/nufkvzbj.png' },
    guest: { id: 934290, name: 'کوچینگ سیتی', logo: 'https://match-cdn.varzesh3.com/football-team/oexzxhcq.png' },
    league: { title: 'لیگ قهرمانان آسیا دو' },
    events: [
      { id: 1, eventType: 1, goalType: 0, side: 0, time: '28', rawTime: 28, description: 'گل دقیقه 28 Choe', strickerName: 'Choe', assisterName: 'Kang' },
      { id: 2, eventType: 1, goalType: 1, side: 1, time: '45+2', rawTime: 45, strickerName: 'P' },
      { id: 3, eventType: 2, cardType: 1, side: 0, time: '30', offendingPlayerName: 'Z' },
      { id: 4, eventType: 2, cardType: 2, side: 1, time: '70', offendingPlayerName: 'R' },
      { id: 5, eventType: 4, side: 0, time: '46', incomingPlayerName: 'IN', outgoingPlayerName: 'OUT' },
      { id: 6, eventType: 5, side: 1, time: '80', description: 'بازبینی VAR' },
      { id: 7, eventType: 3, side: 0, time: '55', kickerName: 'K' }
    ]
  })
  assert.ok(detail)
  assert.equal(detail.league, 'لیگ قهرمانان آسیا دو')
  assert.equal(detail.host.logo, 'https://match-cdn.varzesh3.com/football-team/nufkvzbj.png')
  assert.deepEqual(
    detail.events.map((event) => [event.id, event.kind, event.minute, event.side, event.player]),
    [
      ['1', 'goal', '28', 'host', 'Choe'],
      ['3', 'yellow', '30', 'host', 'Z'],
      ['2', 'goal', '45+2', 'guest', 'P'],
      ['5', 'sub', '46', 'host', 'IN'],
      ['7', 'penalty', '55', 'host', 'K'],
      ['4', 'red', '70', 'guest', 'R'],
      ['6', 'var', '80', 'guest', '']
    ]
  )
  assert.equal(detail.events[0].other, 'Kang')
  assert.equal(detail.events[3].other, 'OUT')
  assert.equal(detail.events[0].text, 'گل دقیقه 28 Choe')
})

test('merging detail keeps downloaded crests and the live minute', () => {
  const base: FootballMatch = {
    ...parsed({ status: 2, isLive: true, liveTime: '63', goals: { host: 1, guest: 0 } }),
    host: { ...parsed().host, logo: 'data:image/png;base64,AAAA' },
    guest: { ...parsed().guest, logo: 'data:image/png;base64,BBBB' }
  }
  const detail = parseMatchDetail({
    id: 497494,
    status: 7,
    statusTitle: 'نتیجه نهایی',
    time: '16:45',
    scheduledStartOnUtc: '2026-10-29T13:15:00Z',
    goals: { host: 2, guest: 1 },
    host: { id: 2, name: 'فجر سپاسی', logo: 'https://match-cdn.varzesh3.com/football-team/01630563.png' },
    guest: { id: 18, name: 'تراکتور', logo: 'https://match-cdn.varzesh3.com/football-team/0bi4mf3k.png' },
    league: { title: 'لیگ برتر ایران' },
    events: [{ id: 9, eventType: 1, side: 0, time: '89', strickerName: 'مهدی' }]
  })
  assert.ok(detail)
  const merged = mergeMatchDetail(base, detail)
  assert.equal(merged.status, 'finished')
  assert.equal(merged.minute, null)
  assert.equal(merged.host.score, 2)
  assert.equal(merged.guest.score, 1)
  assert.equal(merged.host.logo, 'data:image/png;base64,AAAA')
  assert.equal(merged.league, 'لیگ برتر ایران')
  assert.equal(merged.stage, 'هفته 11')
  assert.equal(merged.statusLabel, 'نتیجه نهایی')
  assert.equal(merged.events.length, 1)
})

test('following teams filters today and favours live games', () => {
  const matches = [
    { ...parsed({ id: 1 }), host: { ...parsed().host, id: '2' }, guest: { ...parsed().guest, id: '18' } },
    { ...parsed({ id: 2 }), host: { ...parsed().host, id: '99' }, guest: { ...parsed().guest, id: '98' } }
  ]
  assert.deepEqual(followedMatches(matches, [{ id: '2' }]).map((match) => match.id), ['1'])
  assert.deepEqual(followedMatches(matches, []).map((match) => match.id), [])
})

test('catalog collects each team once with its next kickoff', () => {
  const today = { ...parsed({ id: 1, startOnUtc: '2026-10-30T12:00:00Z' }) }
  const later = {
    ...parsed({ id: 2, startOnUtc: '2026-10-31T12:00:00Z', host: { id: 2, name: 'فجر سپاسی', logo: '' } })
  }
  const past = {
    ...parsed({
      id: 3,
      startOnUtc: '2026-10-28T12:00:00Z',
      status: 7,
      goals: { host: 1, guest: 0 },
      host: { id: 99, name: 'تیم گذشته', logo: '' },
      guest: { id: 98, name: 'تیم دیگر', logo: '' }
    })
  }
  const catalog = buildCatalog([today, later, past], NOW)
  const tractor = catalog.find((team) => team.id === '18')
  assert.ok(tractor)
  assert.equal(tractor.matches, 2)
  assert.equal(tractor.nextAt, Date.parse('2026-10-30T12:00:00Z'))
  assert.deepEqual(
    catalog.filter((team) => team.nextAt === 0).map((team) => team.id).sort(),
    ['98', '99']
  )
  assert.equal(catalog.filter((team) => team.id === '2').length, 1)
})

test('the standing link comes from the league tabs and nowhere else', () => {
  const league = {
    tabs: [
      {
        title: 'جدول',
        type: 1,
        _links: [
          { href: 'https://web-api.varzesh3.com/v2.0/football/leagues/6/seasons/903038/records' },
          { href: 'https://web-api.varzesh3.com/v2.0/football/leagues/6/seasons/903038/standing' }
        ]
      },
      { title: 'بازی ها', type: 2, _links: [{ href: 'https://web-api.varzesh3.com/v2.0/football/leagues/6/matches' }] }
    ]
  }
  assert.equal(
    standingTabHref(league),
    'https://web-api.varzesh3.com/v2.0/football/leagues/6/seasons/903038/standing'
  )
  assert.equal(
    standingTabHref({
      tabs: [{ _links: [{ href: 'https://example.com/v2.0/standing' }] }]
    }),
    ''
  )
  assert.equal(standingTabHref({ tabs: 'nope' }), '')
  assert.equal(standingTabHref(null), '')
})

test('a league table keeps ranks, numbers and only real accent colours', () => {
  const parsed = parseStanding({
    title: 'جدول لیگ برتر ایران (خلیج فارس)',
    teams: [
      {
        rank: 2,
        id: 18,
        name: 'تراکتور',
        logo: 'https://match-cdn.varzesh3.com/football-team/0bi4mf3k.png',
        played: 11,
        wins: 6,
        draws: 3,
        losses: 2,
        goalFor: 15,
        goalAgainst: 8,
        goalDifference: 7,
        points: 21,
        qualificationColor: '#0f40d2'
      },
      {
        rank: 1,
        id: 10,
        name: 'سپاهان',
        logo: '',
        played: 11,
        wins: 7,
        draws: 2,
        losses: 2,
        goalFor: 19,
        goalAgainst: 7,
        points: 23,
        qualificationColor: 'javascript:alert(1)'
      },
      { rank: 0, name: 'بدون شناسه', points: -4 },
      { name: '' },
      { name: 'تراکتور', rank: 9 }
    ]
  })
  assert.equal(parsed.title, 'جدول لیگ برتر ایران (خلیج فارس)')
  assert.deepEqual(parsed.rows.map((row) => row.name), ['سپاهان', 'تراکتور', 'بدون شناسه'])
  assert.deepEqual(parsed.rows.map((row) => row.rank), [1, 2, 3])
  assert.equal(parsed.rows[0].goalDifference, 12)
  assert.equal(parsed.rows[0].accent, '')
  assert.equal(parsed.rows[1].accent, '#0f40d2')
  assert.equal(parsed.rows[1].teamId, '18')
  assert.equal(parsed.rows[2].teamId, 'بدون شناسه')
  assert.equal(parsed.rows[2].points, 0)
  assert.equal(parsed.rows[2].goalDifference, null)
  assert.equal(parsed.rows[1].followed, false)
})

function goalMatch(overrides: Partial<FootballMatch> = {}): FootballMatch {
  const base = {
    ...parsed({ status: 2, isLive: true, liveTime: '67', goals: { host: 1, guest: 0 } })
  }
  return {
    ...base,
    host: { ...base.host, score: 1 },
    guest: { ...base.guest, score: 0 },
    events: [{ id: 'g1', kind: 'goal', minute: '67', order: 67, side: 'host', player: 'مهدی', other: '', text: '' }],
    eventsLoaded: true,
    ...overrides
  }
}

const ALL_ALERTS = { goalAlerts: true, startAlerts: true, redAlerts: true, finalAlerts: true }

test('alerts never fire on the first observation', () => {
  assert.deepEqual(footballAlerts(null, goalMatch(), ALL_ALERTS), [])
})

test('a new goal alert carries the scorer, the score and the minute in Persian digits', () => {
  const previous = goalMatch()
  const next = goalMatch({
    events: [
      ...previous.events,
      { id: 'g2', kind: 'goal', minute: '82', order: 82, side: 'guest', player: 'طارمی', other: '', text: '' }
    ],
    guest: { ...previous.guest, score: 1 }
  })
  const alerts = footballAlerts(previous, next, ALL_ALERTS)
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].kind, 'goal')
  assert.equal(alerts[0].title, 'گل — طارمی')
  assert.match(alerts[0].detail, /دقیقه ۸۲/)
  assert.match(alerts[0].detail, /۱ – ۱/)
  assert.deepEqual(footballAlerts(next, next, ALL_ALERTS), [])
})

test('a score change without a matching event still raises one goal', () => {
  const previous = goalMatch()
  const next = goalMatch({ host: { ...previous.host, score: 2 } })
  const alerts = footballAlerts(previous, next, ALL_ALERTS)
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].kind, 'goal')
  assert.match(alerts[0].detail, /۲ – ۰/)
  assert.deepEqual(footballAlerts(previous, next, { ...ALL_ALERTS, goalAlerts: false }), [])
})

test('kickoff, red cards and the final whistle each announce once', () => {
  const scheduled = parsed({ status: 1 })
  const live = goalMatch({ status: 'live' })
  assert.equal(footballAlerts(scheduled, live, ALL_ALERTS)[0].kind, 'start')

  const withRed = goalMatch({
    events: [
      ...goalMatch().events,
      { id: 'r1', kind: 'red', minute: '72', order: 72, side: 'host', player: 'کنعانی', other: '', text: '' }
    ]
  })
  const red = footballAlerts(goalMatch(), withRed, ALL_ALERTS)
  assert.equal(red.length, 1)
  assert.equal(red[0].kind, 'red')
  assert.match(red[0].detail, /کنعانی/)
  assert.match(red[0].detail, /۷۲/)

  const finished = goalMatch({ status: 'finished', minute: null, statusLabel: 'نتیجه نهایی' })
  const final = footballAlerts(goalMatch(), finished, ALL_ALERTS)
  assert.equal(final.length, 1)
  assert.equal(final[0].kind, 'final')
  assert.equal(final[0].detail, scoreLine(finished))

  assert.deepEqual(footballAlerts(live, withRed, { ...ALL_ALERTS, redAlerts: false }), [])
})

test('a canceled match never announces a final result', () => {
  const live = goalMatch({ status: 'live' })
  const canceled = goalMatch({ status: 'canceled', minute: null })
  assert.deepEqual(
    footballAlerts(live, canceled, ALL_ALERTS).filter((alert) => alert.kind === 'final'),
    []
  )
})

test('stored football and move settings are cleaned and clamped', async () => {
  const { mergeSettings } = await import('../src/main/store/defaults.ts')
  const teams = Array.from({ length: 12 }, (_, index) => ({
    id: String(index + 1),
    name: `تیم ${index + 1}`,
    logo: index === 0 ? 'javascript:alert(1)' : 'data:image/png;base64,AAAA',
    league: 'لیگ'
  }))
  teams.push({ id: '1', name: 'تکراری', logo: '', league: '' })
  const settings = mergeSettings({
    football: { enabled: false, teams, goalAlerts: false },
    move: { enabled: false, everyMin: 4, startHour: 22, endHour: 6, notify: true }
  })
  assert.equal(settings.football.enabled, false)
  assert.equal(settings.football.goalAlerts, false)
  assert.equal(settings.football.startAlerts, true)
  assert.equal(settings.football.teams.length, 10)
  assert.equal(settings.football.teams[0].logo, '')
  assert.equal(settings.football.teams[1].logo, 'data:image/png;base64,AAAA')
  assert.deepEqual(settings.football.teams.map((team) => team.id), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  assert.equal(settings.move.enabled, false)
  assert.equal(settings.move.everyMin, 15)
  assert.equal(settings.move.startHour, 9)
  assert.equal(settings.move.endHour, 21)
  assert.equal(settings.move.notify, true)
})

test('a window that ends before it starts falls back to the default day', async () => {
  const { mergeSettings } = await import('../src/main/store/defaults.ts')
  const settings = mergeSettings({ move: { startHour: 20, endHour: 20 } })
  assert.equal(settings.move.startHour, 9)
  assert.equal(settings.move.endHour, 21)
  const custom = mergeSettings({ move: { startHour: 7, endHour: 23 } })
  assert.equal(custom.move.startHour, 7)
  assert.equal(custom.move.endHour, 23)
})

test('the first detail response seeds history instead of replaying it', () => {
  const withoutEvents = goalMatch({ events: [], eventsLoaded: false })
  const withHistory = goalMatch({
    events: [
      { id: 'g0', kind: 'goal', minute: '12', order: 12, side: 'host', player: 'قدیم', other: '', text: '' },
      { id: 'r0', kind: 'red', minute: '20', order: 20, side: 'guest', player: 'قدیم', other: '', text: '' }
    ],
    eventsLoaded: true
  })
  const alerts = footballAlerts(withoutEvents, withHistory, ALL_ALERTS)
  assert.deepEqual(alerts.map((alert) => alert.kind), [])
  assert.equal(withHistory.eventsLoaded, true)
  assert.equal(parsed().eventsLoaded, false)
  assert.equal(parsed({ hasDetails: true }).hasDetails, true)
})

test('the league list keeps only id-named entries, deduped', () => {
  const leagues = parseLeagues([
    { id: 6, name: 'لیگ برتر انگلیس', logo: 'https://cdn/varzesh3/6.png' },
    { id: 7, title: 'لیگ برتر اسپانیا' },
    { id: 6, name: 'تکراری' },
    { id: 8, name: '   ' },
    { name: 'بی‌شناسه' },
    'نه شیء',
    null
  ])
  assert.deepEqual(leagues, [
    { id: '6', name: 'لیگ برتر انگلیس' },
    { id: '7', name: 'لیگ برتر اسپانیا' }
  ])
  assert.deepEqual(parseLeagues({ leagues: [{ id: 1, name: 'لیگ برتر ایران' }] }), [
    { id: '1', name: 'لیگ برتر ایران' }
  ])
  assert.deepEqual(parseLeagues(undefined), [])
})

test('picked league tables are capped at two and deduped', async () => {
  const { cleanFootballLeagues } = await import('../src/main/store/defaults.ts')
  assert.deepEqual(cleanFootballLeagues('no'), [])
  assert.deepEqual(
    cleanFootballLeagues([
      { id: ' 6 ', name: 'لیگ برتر انگلیس' },
      { id: '6', name: 'تکراری' },
      { id: '', name: 'بی‌شناسه' },
      { id: '7', name: '' },
      { id: '8', name: 'لیگ برتر ایتالیا' },
      { id: '9', name: 'لیگ برتر آلمان' },
      null
    ]),
    [
      { id: '6', name: 'لیگ برتر انگلیس' },
      { id: '8', name: 'لیگ برتر ایتالیا' }
    ]
  )
})

test('a stored profile without league picks still gets the empty table list', async () => {
  const { mergeSettings } = await import('../src/main/store/defaults.ts')
  assert.deepEqual(mergeSettings({ football: { enabled: true } }).football.leagues, [])
})
