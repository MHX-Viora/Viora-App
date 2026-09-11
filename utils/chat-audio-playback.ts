type ChatAudioPlayer = {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => Promise<void>;
};

type ChatAudioStatus = {
  currentTime: number;
  didJustFinish: boolean;
  duration: number;
  playing: boolean;
};

export const toggleChatAudioPlayback = async ({
  player,
  preparePlayback,
  status,
}: {
  player: ChatAudioPlayer;
  preparePlayback: () => Promise<void>;
  status: ChatAudioStatus;
}) => {
  if (status.playing) {
    player.pause();
    return;
  }

  await preparePlayback();
  if (
    status.didJustFinish ||
    (status.duration > 0 && status.currentTime >= status.duration - 0.05)
  ) {
    await player.seekTo(0);
  }
  player.play();
};
