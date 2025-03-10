import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquareMore } from "lucide-react";
import { MessagePage } from "./MessagePage";
import { RoomMessageData } from "@/helpers";
import { useState } from "react";

export function RTCDialog({ isRoomFull, messages }: { isRoomFull: boolean; messages: RoomMessageData[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild onClick={(e) => !isRoomFull && e.preventDefault()}>
        <Button className="animate-shine bg-[#5E548E] text-white" disabled={!isRoomFull}>
          <MessageSquareMore />
          Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-5xl">
        <DialogHeader>
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        <div>
          <MessagePage isRoomFull={isRoomFull} messages={messages} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
