import React from 'react';
import { AnyMsg } from '../types';
import { isSystemMsg } from '../utils';
import { SystemMessage } from './SystemMessage';
import { MessageBubble } from './MessageBubble';

export function MessageGroup({ msgs }: { msgs: AnyMsg[] }) {
  return (
    <>
      {msgs.map((msg, idx) => {
        if (isSystemMsg(msg)) {
          return <SystemMessage key={msg.id} msg={msg} />;
        }
        return <MessageBubble key={msg.id} msg={msg} idx={idx} groupMsgs={msgs} />;
      })}
    </>
  );
}
