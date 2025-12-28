----
title: Futari Syntax 
----

## Starting The Server

```ts
// index.ts
import {Server} from "futari"

const app = Server()

app.config({
    cors: true, 
    compression: {
        enabled: true, 
    }, 
    layerCaching: true, 
})

app.liveOn(3000, () => {
    console.log(`server running`)
})
```


```ts
// src/routes/auth
@Route()
export default class Auth {
    f: ServerFNs
    constructor(config){
        f: config
    }

    @Post('/')
    @Mid(CAuthClient.Guard())
    @Mid(f.SignedRoute({sources: ['mobile']}))
    @Mid(f.AcceptOnly(['application/json']))
    @Mid(f.Validate(Login))
    @Mid(f.Limit(100))
    login = f.handler(async (req) => {
        return {
            data: ''
        }
    })
}
```

```ts
export class LoginDTO implements FutariValidator {
    password: 'string -> @Password()'
}
```