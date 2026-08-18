// Ad-hoc signs the macOS app bundle.
//
// Without a Developer ID certificate, electron-builder skips signing entirely:
// `identity: null` disables it, and `identity: "-"` is looked up as a keychain
// name rather than treated as the ad-hoc marker. Either way the bundle ships
// with only the linker-signed stub Apple puts on arm64 binaries, which seals no
// resources. macOS refuses to launch that once the file carries a quarantine
// attribute, reporting it as "damaged and can't be opened" — not real
// corruption, but a signature that cannot be validated.
//
// Signing with the "-" pseudo-identity here produces a genuine ad-hoc signature
// over the whole bundle. The app still isn't notarized, so Gatekeeper shows the
// ordinary "unidentified developer" prompt, which right-click -> Open bypasses.
import { execFileSync } from 'node:child_process'

// codesign rejects extended attributes with "resource fork, Finder information,
// or similar detritus not allowed". Building inside a synced folder (Google
// Drive, Dropbox) is the usual source: the file provider re-stamps xattrs
// asynchronously, so a single strip can lose a race against it. CI builds in a
// plain directory and clears on the first pass.
function signOnce(app) {
  execFileSync('xattr', ['-cr', app], { stdio: 'inherit' })
  execFileSync('codesign', ['--sign', '-', '--force', '--deep', '--timestamp=none', app], {
    stdio: 'inherit',
  })
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' })
}

export default async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const app = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`

  try {
    signOnce(app)
  } catch {
    // One retry, for the synced-folder race described above.
    signOnce(app)
  }

  console.log(`  • ad-hoc signed ${app}`)
}
