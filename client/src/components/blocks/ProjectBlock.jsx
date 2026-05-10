import './blocks.css';

export default function ProjectBlock({ block }) {
  return (
    <div className="block project-block">
      <div className="project-header">
        <h3 className="block-title">{block.title}</h3>
        {block.status && (
          <span className={`project-status project-status-${block.status}`}>
            {block.status}
          </span>
        )}
      </div>
      {block.description && <p className="project-description">{block.description}</p>}
      {block.stack?.length > 0 && (
        <div className="project-stack">
          {block.stack.map(tech => (
            <span key={tech} className="project-stack-tag">{tech}</span>
          ))}
        </div>
      )}
      <div className="project-links">
        {block.live_url && (
          <a
            href={block.live_url}
            target="_blank"
            rel="noopener noreferrer"
            className="project-link-btn"
            onPointerDown={e => e.stopPropagation()}
          >
            live
          </a>
        )}
        {block.repo_url && (
          <a
            href={block.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="project-link-btn"
            onPointerDown={e => e.stopPropagation()}
          >
            repo
          </a>
        )}
      </div>
    </div>
  );
}
