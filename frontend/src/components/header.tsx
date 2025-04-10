import { useAppContext } from "@/Context";
import { MessageCircle } from "lucide-react";

export default function Header() {
  const { thisUserId } = useAppContext();
  return (
    <>
      <div className="flex justify-between w-full pb-2">
        <div className="flex gap-2 items-center text-2xl font-semibold border-b pb-2 appheader-colors">
          <MessageCircle />
          Peer 2 Peer
        </div>
        <div className="appheader-userid-colors">#{thisUserId}</div>
      </div>
      <div className="text-sm font-normal appheader-subheading-colors">Peer to peer implementation using WebRTC</div>
    </>
  );
}
