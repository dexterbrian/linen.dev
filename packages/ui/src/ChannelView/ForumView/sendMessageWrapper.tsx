import {
  SerializedChannel,
  SerializedThread,
  SerializedUser,
  SerializedAccount,
  UploadedFile,
  StartSignUpProps,
} from '@linen/types';
import { scrollToTop } from '@linen/utilities/scroll';
import { createThreadImitation } from '@linen/serializers/thread';
import { localStorage } from '@linen/utilities/storage';

export function sendMessageWrapper({
  currentUser,
  allUsers,
  currentChannel,
  setUploads,
  setThreads,
  scrollableRootRef,
  currentCommunity,
  startSignUp,
  createThread,
}: {
  currentUser: SerializedUser | null;
  allUsers: SerializedUser[];
  currentChannel: SerializedChannel;
  setUploads: any;
  setThreads: any;
  scrollableRootRef: any;
  currentCommunity: SerializedAccount;
  startSignUp: (props: StartSignUpProps) => Promise<void>;
  createThread: any;
}) {
  return async ({
    message,
    title,
    files,
    channelId,
  }: {
    message: string;
    title?: string;
    files: UploadedFile[];
    channelId: string;
  }) => {
    if (!currentUser) {
      localStorage.set('signup.thread', {
        body: message,
        channelId,
      });
      startSignUp?.({
        communityId: currentCommunity.id,
      });
      return;
    }
    const imitation = createThreadImitation({
      message,
      title,
      mentions: allUsers,
      files,
      author: currentUser,
      channel: currentChannel,
    });
    setUploads([]);
    setThreads((threads: SerializedThread[]) => {
      return [...threads, imitation];
    });
    setTimeout(() => scrollToTop(scrollableRootRef.current as HTMLElement), 0);
    return createThread({
      body: message,
      title,
      files,
      accountId: currentCommunity.id,
      channelId,
      imitationId: imitation.id,
    }).then(
      ({
        thread,
        imitationId,
      }: {
        thread: SerializedThread;
        imitationId: string;
      }) => {
        setThreads((threads: SerializedThread[]) => {
          const threadId = thread.id;
          let index;
          index = threads.findIndex((thread) => thread.id === threadId);
          if (index >= 0) {
            return threads;
          }
          return [
            ...threads.filter((thread) => thread.id !== imitationId),
            thread,
          ];
        });
      }
    );
  };
}
