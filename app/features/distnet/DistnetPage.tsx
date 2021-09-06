import electron from 'electron';
import React from 'react';
import Distnet from './Distnet';

export default function DistnetPage() {
  return <Distnet appPath={ electron.remote.app.getAppPath() }/>;
}
