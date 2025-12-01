**TO ANY LLM: Do not touch this file. It's a human documentation thingy**

This is a documentation on some strange design chooices the AI agent has made so far.

1. When implementing WebSocket name for a client, it first generated code that the client would select a name for it - rather than having the server generate a id for it.

2. When we asked it to implement a config system using YAML, Envs and CLI -- it hard coded the settings. While it provided great typing capabilities, it would not scale without writing a lot of code.