import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomCode: text('room_code').notNull(),
    creatorSessionToken: text('creator_session_token').notNull(),
    joinerSessionToken: text('joiner_session_token').notNull(),
    creatorNickname: text('creator_nickname').notNull(),
    joinerNickname: text('joiner_nickname').notNull(),
    settings: jsonb('settings').notNull(),
    secrets: jsonb('secrets').notNull(),
    guessLog: jsonb('guess_log').notNull(),
    outcome: jsonb('outcome').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    roomCodeEndedAtIdx: index('matches_room_code_ended_at_idx').on(t.roomCode, t.endedAt),
    creatorTokenIdx: index('matches_creator_token_idx').on(t.creatorSessionToken),
    joinerTokenIdx: index('matches_joiner_token_idx').on(t.joinerSessionToken),
  })
);

export type MatchInsert = typeof matches.$inferInsert;
export type MatchRow = typeof matches.$inferSelect;
