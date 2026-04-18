import { resolveMediaSrc } from '../../utils/block';
import './blocks.css';

const SOUNDCLOUD_BASE = 'https://w.soundcloud.com/player/';

function getSoundCloudEmbed(url) {
  const params = new URLSearchParams({
    url,
    color: '#aaaaaa',
    auto_play: 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'false',
    show_reposts: 'false',
    show_teaser: 'false',
  });
  return `${SOUNDCLOUD_BASE}?${params}`;
}

export default function AudioBlock({ block }) {
  const isEmbed = block.src?.startsWith('http');
  const albumArtSrc = resolveMediaSrc(block.album_art);

  return (
    <div
      className="block audio-block"
      style={albumArtSrc ? { backgroundImage: `url(${albumArtSrc})` } : {}}
    >
      <div className="audio-overlay">
        <div className="audio-meta">
          <h3 className="block-title">{block.title}</h3>
          {block.artist && <p className="audio-artist">{block.artist}</p>}
        </div>
        {isEmbed ? (
          <iframe
            className="audio-embed"
            style={{ border: 'none' }}
            scrolling="no"
            allow="autoplay"
            src={getSoundCloudEmbed(block.src)}
          />
        ) : (
          <audio className="audio-player" controls src={resolveMediaSrc(block.src)} />
        )}
      </div>
    </div>
  );
}
