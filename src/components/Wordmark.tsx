/** Logo et nom de l'application. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <img className="wordmark-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
      Zapette
    </span>
  )
}
