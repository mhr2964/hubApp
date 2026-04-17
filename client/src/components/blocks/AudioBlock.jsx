import './blocks.css';

function getSoundCloudEmbed(url) {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23aaaaaa&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;
}

export default function AudioBlock({ block }) {
  const isEmbed = block.src?.startsWith('http');

  return (
    <div
      className="block audio-block"
      style={block.album_art ? { backgroundImage: `url(/api/content/${block.album_art})` } : {}}
    >
      <div className="audio-overlay">
        <div className="audio-meta">
          <h3 className="block-title">{block.title}</h3>
          {block.artist && <p className="audio-artist">{block.artist}</p>}
        </div>
        {isEmbed ? (
          <iframe
            className="audio-embed"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={getSoundCloudEmbed(block.src)}
          />
        ) : (
          <audio className="audio-player" controls src={`/api/content/${block.src}`} />
        )}
      </div>
    </div>
  );
}
