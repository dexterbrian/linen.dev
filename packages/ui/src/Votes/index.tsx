import React from 'react';
import classNames from 'classnames';
import {
  SerializedMessage,
  SerializedReaction,
  SerializedThread,
  SerializedUser,
} from '@linen/types';
import styles from './index.module.scss';
import { FiChevronDown } from '@react-icons/all-files/fi/FiChevronDown';
import { FiChevronUp } from '@react-icons/all-files/fi/FiChevronUp';

interface Props {
  thread: SerializedThread;
  currentUser?: SerializedUser | null;
  onReaction({
    threadId,
    messageId,
    type,
    active,
  }: {
    threadId: string;
    messageId: string;
    type: string;
    active: boolean;
  }): void;
}

function hasReaction(
  message: SerializedMessage,
  type: string,
  userId?: string
): boolean {
  if (!userId) {
    return false;
  }
  const reaction = message.reactions.find(
    (reaction: SerializedReaction) => reaction.type === type
  );
  if (!reaction) {
    return false;
  }
  return !!reaction.users.find(({ id }: SerializedUser) => id === userId);
}

export default function Votes({ thread, currentUser, onReaction }: Props) {
  const { messages } = thread;
  const message = messages[0];
  const upvotes = message.reactions.find(
    (reaction: SerializedReaction) => reaction.type === ':thumbsup:'
  ) || { count: 0 };
  const downvotes = message.reactions.find(
    (reaction: SerializedReaction) => reaction.type === ':thumbsdown:'
  ) || { count: 0 };
  const votes = upvotes.count - downvotes.count;
  const isThumbsUpActive = hasReaction(message, ':thumbsup:', currentUser?.id);
  const isThumbsDownActive = hasReaction(
    message,
    ':thumbsdown:',
    currentUser?.id
  );
  return (
    <div
      className={classNames(styles.votes, {
        [styles.positive]: votes > 0,
        [styles.negative]: votes < 0,
      })}
    >
      <FiChevronUp
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onReaction({
            threadId: thread.id,
            messageId: message.id,
            type: ':thumbsup:',
            active: isThumbsUpActive,
          });
        }}
        className={classNames(styles.icon, {
          [styles.active]: isThumbsUpActive,
        })}
      />
      {votes}
      <FiChevronDown
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onReaction({
            threadId: thread.id,
            messageId: message.id,
            type: ':thumbsdown:',
            active: isThumbsDownActive,
          });
        }}
        className={classNames(styles.icon, {
          [styles.active]: isThumbsDownActive,
        })}
      />
    </div>
  );
}
