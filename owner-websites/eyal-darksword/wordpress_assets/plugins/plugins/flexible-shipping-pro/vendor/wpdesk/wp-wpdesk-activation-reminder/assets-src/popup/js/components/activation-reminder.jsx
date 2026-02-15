import React from "react";
import {Button, Col, Container, Modal, Row} from "react-bootstrap";
import Cookies from 'js-cookie';

/**
 * ActivationReminder REACT class.
 */
export default class ActivationReminder extends React.Component {

    /**
     * @param {Object} props
     */
    constructor( props ) {
        super( props );

        let cookie_name = props.cookie_name;

        this.state = {
            show: this.shouldShow( cookie_name ),
            logo_url: props.logo_url,
            plugin_dir: props.plugin_dir,
            plugin_title: props.plugin_title,
            cookie_name: cookie_name,
        };

        this.handleClose = this.handleClose.bind(this);
        this.handleGetLicence = this.handleGetLicence.bind(this);
    };

    /**
     *
     */
    handleClose() {
        this.setState( { show: false } );
    }

    /**
     * @param {String} cookie_name
     * @return {boolean}
     */
    shouldShow( cookie_name ) {
        let timestamp = Math.round(new Date() / 1000);
        let cookie = Cookies.get( cookie_name );
        if ( cookie === undefined ) {
            Cookies.set( cookie_name, timestamp + 60 * 60 * 24 * 14, { expires: 730 } );
        } else if ( cookie < timestamp ) {
            Cookies.set( cookie_name, timestamp + 60 * 60 * 24 * 14, { expires: 730 } );
            return true;
        }

        return false;
    }

    /**
     *
     */
    handleGetLicence() {
        window.open( this.props.buy_plugin_url );
    }

    /**
     * @returns {JSX.Element}
     */
    render() {
        let state = this.state;
        return (
            <Modal
                size="lg"
                show={state.show}
                onHide={this.handleClose}
                className={"wpdesk-activation-reminder-popup"}
                centered
            >
                <Modal.Header closeButton></Modal.Header>
                <Modal.Body>
                    <Container>
                        <img className={"logo"} src={this.state.logo_url} />
                    </Container>
                    <Container>
                        <Row className={"header"}>
                            <Col>
                                <h1>Activate {this.props.plugin_title} License</h1>
                                <h2>We've noticed that you haven't activated the license for the {this.props.plugin_title} plugin.</h2>
                            </Col>
                        </Row>
                        <Row className={"benefits"}>
                            <Col>
                                <strong>With a valid license you get:</strong>
                                <ul>
                                    <li><span className="dashicons dashicons-yes"/>premium support</li>
                                    <li><span className="dashicons dashicons-yes"/>new features</li>
                                    <li><span className="dashicons dashicons-yes"/>safety updates</li>
                                    <li><span className="dashicons dashicons-yes"/>plugin from a safe source, with verified code and without any malware</li>
                                </ul>
                                In addition, you'll support WordPress and WooCommerce community.<br/>
                                <a target="_blank" href="https://wpde.sk/fs-license">Learn more about the benefits of having an active license key →</a>
                            </Col>
                        </Row>
                        <Row className={"get-licence"}>
                            <Col>
                                <Button variant="primary" onClick={this.handleGetLicence}>
                                    Get your license!
                                </Button>
                            </Col>
                        </Row>
                        <Row className={"activation"}>
                            <Col>
                                Already have a license key? <a target="_blank" href={this.props.how_to_activate_link}>Learn how to activate it in your store →</a>
                            </Col>
                        </Row>
                    </Container>
                </Modal.Body>
            </Modal>
        );
    }


}