const fs = require('fs');
const forge = require('node-forge');

try {
  // Read the PFX file
  const pfxData = fs.readFileSync('ssl/localhost.pfx');
  const pfxAsn1 = forge.asn1.fromDer(pfxData.toString('binary'));
  const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, 'DevPassword123');

  // Get certificate
  const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag][0];
  const cert = forge.pki.certificateToPem(certBag.cert);

  // Get private key
  const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
  const key = forge.pki.privateKeyToPem(keyBag.key);

  // Write files
  fs.writeFileSync('ssl/localhost.crt', cert);
  fs.writeFileSync('ssl/localhost.key', key);
  
  console.log('Certificate files created successfully!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
