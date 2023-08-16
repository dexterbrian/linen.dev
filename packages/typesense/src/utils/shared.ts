import {
  Prisma,
  channels,
  mentions,
  messageAttachments,
  messageReactions,
  messages,
  prisma,
  threads,
  users,
} from '@linen/database';
import { SerializedSearchSettings, Logger } from '@linen/types';
import { client } from './client';
import { serializer } from './serializer';
import { serializeThread } from '@linen/serializers/thread';
import { collectionSchema } from './model';

export async function getAccountSettings(accountId: string) {
  const account = await prisma.accounts.findUnique({
    where: {
      id: accountId,
    },
  });

  if (!account) {
    throw new Error(`account not found: ${accountId}`);
  }

  if (!account.searchSettings) {
    throw new Error(`missing searchSettings: ${accountId}`);
  }

  const searchSettings: SerializedSearchSettings = JSON.parse(
    account.searchSettings
  );
  return searchSettings;
}

export async function queryThreads({
  where,
  orderBy,
  take,
}: Prisma.threadsFindManyArgs) {
  return await prisma.threads.findMany({
    include: {
      messages: {
        include: {
          author: true,
          mentions: {
            include: {
              users: true,
            },
          },
          reactions: true,
          attachments: true,
        },
        orderBy: { sentAt: 'asc' },
      },
      channel: {
        include: {
          memberships: {
            select: {
              usersId: true,
            },
          },
        },
      },
    },
    where,
    orderBy,
    take,
  });
}

export function threadsWhere({ accountId }: { accountId: string }) {
  return {
    channel: {
      account: { id: accountId },
      hidden: false,
    },
    hidden: false,
    messageCount: { gt: 0 },
  };
}

/** persist timestamp as flag for next sync job */
export async function persistEndFlag(
  searchSettings: SerializedSearchSettings,
  accountId: string
) {
  searchSettings.lastSync = new Date().getTime();
  // persist
  await prisma.accounts.update({
    where: { id: accountId },
    data: {
      searchSettings: JSON.stringify(searchSettings),
    },
  });
}

export async function pushToTypesense({
  threads,
  is_restrict,
  logger,
}: {
  threads: (threads & {
    messages: (messages & {
      author: users | null;
      reactions: messageReactions[];
      attachments: messageAttachments[];
      mentions: (mentions & {
        users: users | null;
      })[];
    })[];
    channel: channels & {
      memberships: {
        usersId: string;
      }[];
    };
  })[];
  is_restrict: boolean;
  logger: Logger;
}) {
  const documents = threads
    .map((t) =>
      serializer({
        thread: serializeThread(t),
        is_public: t.channel.type === 'PUBLIC',
        is_restrict,
        accessible_to:
          t.channel.type === 'PUBLIC'
            ? []
            : t.channel.memberships.map((m) => m.usersId),
      })
    )
    .filter((t) => !!t.body);

  await client
    .collections(collectionSchema.name)
    .documents()
    .import(documents, { action: 'upsert' })
    .catch((error: any) => {
      logger.error(
        error.importResults
          ?.filter((result: any) => !result.success)
          ?.map((result: any) => result.error) || error
      );
    });
}
