import baseConfig, { domainObjectsExposeNoAccessors } from '../../eslint.config.mjs';

export default [...baseConfig, domainObjectsExposeNoAccessors];
