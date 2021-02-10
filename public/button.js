const button = document.getElementById('downloadMapButton')

button.addEventListener('click', async () => {
  const { body } = await fetch('/download')
  const reader = body.getReader()
  const content = await reader.read()
  const decoder = new TextDecoder()
  const uri = decoder.decode(content.value)

  window.open(uri)
})