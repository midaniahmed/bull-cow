import { useNavigate } from 'react-router-dom';
import { RoomCodeInput } from '../components/inputs/RoomCodeInput.js';

export function JoinRoomPage() {
  const nav = useNavigate();
  return (
    <div className="max-w-md mx-auto pt-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-center">Join a Room</h2>
      <RoomCodeInput onSubmit={(code) => nav(`/room/${code}`)} />
    </div>
  );
}
