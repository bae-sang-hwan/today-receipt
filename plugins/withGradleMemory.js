const { withGradleProperties } = require('expo/config-plugins');

// 릴리스 빌드의 R8 단계가 기본값(힙 2GB, Metaspace 512MB)에서 메모리 부족(Metaspace)으로 실패해 늘린다.
// android/ 폴더는 prebuild마다 새로 만들어지므로 gradle.properties를 직접 고치지 않고 여기서 설정한다.
const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';

module.exports = (config) =>
  withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'));
    cfg.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    return cfg;
  });
