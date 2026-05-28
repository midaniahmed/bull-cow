import { useNavigate } from 'react-router-dom';
import { RoomCodeInput } from '../components/inputs/RoomCodeInput.js';

export function JoinRoomPage() {
  const nav = useNavigate();
  return (
    <div className="max-w-md mx-auto pt-10 flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-grad">Enter the code</h2>
        <p className="text-sm text-muted mt-2">Punch in your opponent's 4-character room code.</p>
      </div>
      <RoomCodeInput onSubmit={(code) => nav(`/room/${code}`)} />
    </div>
  );
}
