import React from 'react';
import { ToastProvider } from 'react-toast-notifications';
import {BrowserRouter, Route, Switch} from "react-router-dom";
import Index from "./pages/Index";

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Switch>
          <Route path="/" component={Index} />
        </Switch>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
