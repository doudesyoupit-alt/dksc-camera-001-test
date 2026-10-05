package jp.dksc.vdraw.signatureinspector;
import org.junit.Test;
import static org.junit.Assert.*;
public class IdentityTest {
    @Test public void knownSha256() { assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", Identity.sha256(new byte[]{97,98,99})); }
    @Test public void acceptsOnlyBaseline() { assertTrue(Identity.matchesBaseline("0.7.0",7,new String[]{Identity.BASELINE_CERT})); }
    @Test public void wrongCertificate() { assertFalse(Identity.matchesBaseline("0.7.0",7,new String[]{Identity.sha256(new byte[]{1})})); }
    @Test public void multipleSignersCannotPass() { assertFalse(Identity.matchesBaseline("0.7.0",7,new String[]{Identity.BASELINE_CERT,Identity.BASELINE_CERT})); }
    @Test public void unavailableCannotPass() { assertFalse(Identity.matchesBaseline("0.7.0",7,null)); assertFalse(Identity.matchesBaseline("0.7.0",7,new String[0])); }
    @Test public void versionCannotPass() { assertFalse(Identity.matchesBaseline("0.7.0",8,new String[]{Identity.BASELINE_CERT})); assertFalse(Identity.matchesBaseline(null,7,new String[]{Identity.BASELINE_CERT})); }
    @Test(expected=IllegalArgumentException.class) public void emptyCertificateFails() { Identity.sha256(new byte[0]); }
    @Test public void displayPreservesHash() { assertEquals(Identity.BASELINE_CERT,Identity.readableHash(Identity.BASELINE_CERT).replace("\n","")); }
}
