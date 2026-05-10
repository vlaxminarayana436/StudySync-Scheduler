import React from 'react';

const SessionList = ({ sessions }: { sessions: any[] }) => {
  return (
    <div className="space-y-4">
      {sessions.map((session, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold">{session.sessionName}</h3>
          <p>{session.startTime} - {session.endTime}</p>
          <p>Hosted by: {session.createdBy}</p>
          {!session.isLaunched ? (
            <button disabled className="bg-gray-500 text-white p-2 rounded-full w-full mt-2">
              Waiting for Host to Launch
            </button>
          ) : (
            <button className="bg-blue-500 text-white p-2 rounded-full w-full mt-2">
              Join Session
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default SessionList;
