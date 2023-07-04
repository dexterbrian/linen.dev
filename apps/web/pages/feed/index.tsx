import React, { useState } from 'react';
import BlankLayout from '@linen/ui/BlankLayout';
import styles from './index.module.scss';
import Row from '@linen/ui/Row';
import { GetServerSidePropsContext } from 'next';
import { Permissions, SerializedThread, Settings } from '@linen/types';
import { FiHash } from '@react-icons/all-files/fi/FiHash';
import LinenLogo from '@linen/ui/LinenLogo';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import FeedService from 'services/feed';
import PermissionsService from 'services/permissions';

interface Props {
  permissions: Permissions;
  threads: SerializedThread[];
  settings: Settings[];
}

const TAKE = 16;

export default function Feed({
  permissions,
  threads: initialThreads,
  settings: initialSettings,
}: Props) {
  const [skip, setSkip] = useState(TAKE);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(true);
  const [threads, setThreads] = useState<SerializedThread[]>(initialThreads);
  const [settings, setSettings] = useState<Settings[]>(initialSettings);
  async function onLoadMore() {
    setLoading(true);
    fetch(`/api/feed?skip=${skip}&take=${TAKE}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then(
        ({
          threads: newThreads,
          settings: newSettings,
        }: {
          threads: SerializedThread[];
          settings: Settings[];
        }) => {
          setLoading(false);
          setSkip((skip) => skip + TAKE);
          setMore(newThreads.length > 0);
          setThreads((threads) => [...threads, ...newThreads]);
          setSettings((settings) => {
            const settingsIds = settings.map((setting) => setting.communityId);
            const settingsToAdd = newSettings.filter(
              (setting) => !settingsIds.includes(setting.communityId)
            );
            return [...settings, ...settingsToAdd];
          });
        }
      );
  }

  const [sentryRef] = useInfiniteScroll({
    loading,
    hasNextPage: more,
    onLoadMore,
    disabled: loading,
    rootMargin: '0px 0px 320px 0px',
    delayInMs: 0,
  });
  return (
    <BlankLayout>
      <div className={styles.background}>
        <LinenLogo className={styles.logo} />
        <main className={styles.main}>
          <header className={styles.header}>
            <FiHash /> Feed
          </header>
          {threads.map((thread) => {
            const setting = settings.find(
              (setting) => setting.communityId === thread.channel?.accountId
            ) as Settings;
            return (
              <Row
                key={thread.id}
                thread={thread}
                permissions={permissions}
                currentUser={null}
                isSubDomainRouting={false}
                settings={setting}
              />
            );
          })}
          <div ref={sentryRef} />
        </main>
      </div>
    </BlankLayout>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const [permissions, { threads, settings }] = await Promise.all([
    PermissionsService.for(context),
    FeedService.get({ skip: 0, take: TAKE }),
  ]);

  return {
    props: {
      permissions,
      threads,
      settings,
    },
  };
};
