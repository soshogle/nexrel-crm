import React from 'react';
import ActivationReminder from "./components/activation-reminder";
import {render} from "react-dom";

document.addEventListener( 'DOMContentLoaded', function () {
    let elements = document.getElementsByClassName( 'wpdesk-activation-reminder' );
    for ( let i = 0; i < elements.length; i ++ ) {
        let element = elements[i];
        render( <ActivationReminder
            logo_url={element.getAttribute( 'data-logo_url' )}
            plugin_dir={element.getAttribute( 'data-plugin_dir' )}
            plugin_title={element.getAttribute( 'data-plugin_title' )}
            cookie_name={element.getAttribute( 'data-cookie_name' )}
            subscriptions_url={element.getAttribute( 'data-subscriptions_url' )}
            buy_plugin_url={element.getAttribute( 'data-buy_plugin_url' )}
            read_more_url={element.getAttribute( 'data-read_more_url' )}
            how_to_activate_link={element.getAttribute( 'data-how_to_activate_link' )}
        />, element );

    }
}, false );
