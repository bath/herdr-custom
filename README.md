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
core/build.sh                       # build hc with the file drop patch
core/install-mac.sh                 # Mac: install it (Linux: hc update --from <printed path>)
app/install.sh                      # Mac only: installs the titled-tabs mod and layout
```

## License

Apache License 2.0, the same as Herdr. `app/mods/titled-tabs` is a changed copy
of Herdr's built-in `tabs` mod, and `core/patches` changes
[herdr-core](https://github.com/herdrdev/herdr-core). Both are by the Herdr
authors, under Apache-2.0.
