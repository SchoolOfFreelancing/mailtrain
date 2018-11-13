'use strict';

import './public-path';

import React, {Component} from 'react';
import ReactDOM
    from 'react-dom';
import {
    I18nextProvider,
    translate,
} from 'react-i18next';
import i18n
    from './i18n';
import {
    parentRPC,
    UntrustedContentRoot
} from './untrusted';
import PropTypes
    from "prop-types";
import styles
    from "./sandboxed-codeeditor.scss";
import {
    getPublicUrl,
    getSandboxUrl,
    getTrustedUrl
} from "./urls";
import {
    base,
    unbase
} from "../../../shared/templates";

import brace from 'brace';
import ACEEditorRaw from 'react-ace';
import 'brace/theme/github';
import 'brace/ext/searchbox';
import 'brace/mode/html';
import {CodeEditorSourceType} from "./sandboxed-codeeditor-shared";

import mjml2html from "mjml4-in-browser";
import juice from "juice";

@translate(null, { withRef: true })
class CodeEditorSandbox extends Component {
    constructor(props) {
        super(props);

        let defaultSource;

        if (props.sourceType === CodeEditorSourceType.MJML) {
            defaultSource =
                '<mjml>\n' +
                '  <mj-body>\n' +
                '    <mj-section>\n' +
                '      <mj-column>\n' +
                '        <!-- First column content -->\n' +
                '      </mj-column>\n' +
                '      <mj-column>\n' +
                '        <!-- Second column content -->\n' +
                '      </mj-column>\n' +
                '    </mj-section>\n' +
                '  </mj-body>\n' +
                '</mjml>';

        } else if (props.sourceType === CodeEditorSourceType.HTML) {
            defaultSource =
                '<!DOCTYPE html>\n' +
                '<html>\n' +
                '<head>\n' +
                '  <meta charset="UTF-8">\n' +
                '  <title>Title of the document</title>\n' +
                '</head>\n' +
                '<body>\n' +
                '  Content of the document......\n' +
                '</body>\n' +
                '</html>';
        }


        const trustedUrlBase = getTrustedUrl();
        const sandboxUrlBase = getSandboxUrl();
        const publicUrlBase = getPublicUrl();
        const source = this.props.initialSource ? base(this.props.initialSource, trustedUrlBase, sandboxUrlBase, publicUrlBase) : defaultSource;

        this.state = {
            source,
            preview: props.initialPreview
        };
    }

    static propTypes = {
        entityTypeId: PropTypes.string,
        entityId: PropTypes.number,
        initialSource: PropTypes.string,
        sourceType: PropTypes.string,
        initialPreview: PropTypes.bool
    }

    async exportState(method, params) {
        const trustedUrlBase = getTrustedUrl();
        const sandboxUrlBase = getSandboxUrl();
        const publicUrlBase = getPublicUrl();
        return {
            source: unbase(this.state.source, trustedUrlBase, sandboxUrlBase, publicUrlBase, true)
        };
    }

    async setPreview(method, preview) {
        this.setState({
            preview
        });
    }

    componentDidMount() {
        parentRPC.setMethodHandler('exportState', ::this.exportState);
        parentRPC.setMethodHandler('setPreview', ::this.setPreview);
    }

    render() {
        let previewContents;

        if (this.props.sourceType === CodeEditorSourceType.MJML) {
            const res = mjml2html(this.state.source);
            previewContents = res.html;
        } else if (this.props.sourceType === CodeEditorSourceType.HTML) {
            previewContents = juice(this.state.source);
        }

        return (
            <div className={styles.sandbox}>
                <div className={this.state.preview ? styles.aceEditorWithPreview : styles.aceEditorWithoutPreview}>
                    <ACEEditorRaw
                        mode="html"
                        theme="github"
                        width="100%"
                        height="100%"
                        onChange={data => this.setState({source: data})}
                        fontSize={12}
                        showPrintMargin={false}
                        value={this.state.source}
                        tabSize={2}
                        setOptions={{useWorker: false}} // This disables syntax check because it does not always work well (e.g. in case of JS code in report templates)
                    />
                </div>
                {
                    this.state.preview &&
                    <div className={styles.preview}>
                        <iframe src={"data:text/html;charset=utf-8," + escape(previewContents)}></iframe>
                    </div>
                }
            </div>
        );
    }
}

export default function() {
    parentRPC.init();

    ReactDOM.render(
        <I18nextProvider i18n={ i18n }>
            <UntrustedContentRoot render={props => <CodeEditorSandbox {...props} />} />
        </I18nextProvider>,
        document.getElementById('root')
    );
};


