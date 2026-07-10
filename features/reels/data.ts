import type { Reel } from '@/types/reel';

export const reels: Reel[] = [
  { id: 'landscape-demo', author: 'minh.thanh.tech', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160', caption: 'Video ngang 16:9 có âm thanh để kiểm tra chế độ cover trên màn hình dọc.', hashtags: '#Technology  #Landscape', videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4', sourceSize: '16:9 + audio', likes: '5.2k', comments: '215' },
  { id: 'vertical-demo', author: 'linh.di.day', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160', caption: 'Video dọc toàn màn hình, phù hợp với trải nghiệm video ngắn trên điện thoại.', hashtags: '#City  #VerticalVideo', videoUrl: 'https://cdn.truefilesize.com/mp4/sample-portrait.mp4', sourceSize: '9:16', likes: '12.8k', comments: '486' },
  { id: 'wide-demo', author: 'coffee.with.me', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160', caption: 'Nguồn video ngang để kiểm tra crop và căn giữa nội dung.', hashtags: '#Coffee  #WideVideo', videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4', sourceSize: '16:9 trailer', likes: '8.6k', comments: '302' },
  { id: 'square-demo', author: 'huy.explore', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160', caption: 'Video vuông để kiểm tra hiển thị nhiều tỷ lệ trong cùng luồng Reels.', hashtags: '#Travel  #SquareVideo', videoUrl: 'https://cdn.truefilesize.com/mp4/sample-square.mp4', sourceSize: '1:1', likes: '21.4k', comments: '913' },
];
