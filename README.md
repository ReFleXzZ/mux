# Mux

Simple plugin for describing tmux layouts.

Example schema:

```json
{
    "mux.projectConfiguration": {
        "session": {
            "windows": [
                {
                    "title": "window 1",
                    "command": "yarn start",
                    "splits": [
                        {
                            "isHorizontal": false,
                            "command": "yarn test"
                        },
                        {
                            "isHorizontal": true,
                            "command": "zsh"
                        }
                    ]
                }
            ]
        }
    }
}
```