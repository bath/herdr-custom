# herdr-custom

Our custom features for [Herdr](https://github.com/herdrdev), kept on top of the
official releases.

| Feature | Part of Herdr | Kind |
|---|---|---|
| File drop | herdr-core (`hc`) | patch series, applied to upstream |
| Titled tabs | Herdr Desktop (herdr-app) | user mod and layout |

See each folder's README for how to build, install and update:
[core/](core/README.md) and [app/](app/README.md).

Quick start:

```sh
core/build.sh                       # then: hc update --from <printed path>, on each machine
app/install.sh                      # Mac only: installs the titled-tabs mod and layout
```
