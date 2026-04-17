export default function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="sectionHeading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p className="sectionText">{description}</p> : null}
    </div>
  );
}
