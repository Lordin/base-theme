/**
 * ScandiPWA - Progressive Web App for Magento
 *
 * Copyright © Scandiweb, Inc. All rights reserved.
 * See LICENSE for license details.
 *
 * @license OSL-3.0 (Open Software License ("OSL") v. 3.0)
 * @package scandipwa/base-theme
 * @link https://github.com/scandipwa/base-theme
 */

import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { ProductDispatcher } from 'Store/Product';
import { changeHeaderState } from 'Store/Header';
import { BreadcrumbsDispatcher } from 'Store/Breadcrumbs';
import { history } from 'Route';
import { ProductType } from 'Type/ProductList';
import { PDP } from 'Component/Header';
import { getUrlParam, getQueryParam, updateQueryParamWithoutHistory } from 'Util/Url';

import ProductPage from './ProductPage.component';

const mapStateToProps = state => ({
    product: state.ProductReducer.product
});

const mapDispatchToProps = dispatch => ({
    changeHeaderState: state => dispatch(changeHeaderState(state)),
    requestProduct: options => ProductDispatcher.handleData(dispatch, options),
    updateBreadcrumbs: breadcrumbs => BreadcrumbsDispatcher.updateWithProduct(breadcrumbs, dispatch),
    clearGroupedProductQuantity: () => ProductDispatcher.clearGroupedProductQuantity(dispatch)
});

export class ProductPageContainer extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            configurableVariantIndex: 0,
            isConfigurationInitialized: false
        };

        this.containerFunctions = {
            updateUrl: this.updateUrl.bind(this),
            getProductOrVariant: this.getProductOrVariant.bind(this)
        };

        this.containerProps = () => ({
            dataSource: this._getDataSource()
        });
    }


    componentDidMount() {
        const { isOnlyPlaceholder } = this.props;
        if (!isOnlyPlaceholder) this._requestProduct();
        this._onProductUpdate();
    }

    /**
     * Get selected configurable product variant
     * @param {Object} props
     * @return {Number} variant index
     */
    static getVariantIndexFromProps(props) {
        const { location: { state: locationState } } = props;

        return (locationState && Object.hasOwnProperty.call(locationState, 'variantIndex'))
            ? locationState.variantIndex
            : null;
    }

    componentDidUpdate(prevProps) {
        const { location } = this.props;

        if (location !== prevProps.location) {
            this._requestProduct();
        }

        if (this._variantIndexInPropsChanged(this.props, prevProps)) {
            // eslint-disable-next-line react/no-unused-state, react/no-did-update-set-state
            this.setState({ isConfigurationInitialized: false });
        }

        this._onProductUpdate();
    }

    componentWillUnmount() {
        const { product: { type_id }, clearGroupedProductQuantity } = this.props;

        if (type_id === 'grouped') return clearGroupedProductQuantity();

        return null;
    }

    static getDerivedStateFromProps(props, state) {
        const { isConfigurationInitialized } = state;
        const { location } = props;
        const variantIndex = parseInt(getQueryParam('variant', location), 10) || 0;
        const shouldConfigurableOptionBeInitialized = !isConfigurationInitialized
            && typeof variantIndex === 'number';

        if (shouldConfigurableOptionBeInitialized) {
            return {
                configurableVariantIndex: variantIndex,
                isConfigurationInitialized: true
            };
        }

        return null;
    }

    /**
     * Get thumbnail picture of the product
     * @param {Number} currentVariantIndex product variant index
     * @param {Object} dataSource product data
     * @return {Number} variant index
     */
    getProductOrVariant(currentVariantIndex, dataSource) {
        const { variants } = dataSource;

        const variant = variants
            && variants[ currentVariantIndex ]
            && variants[ currentVariantIndex ].product;

        return variant || dataSource;
    }

    _onProductUpdate() {
        const dataSource = this._getDataSource();

        if (Object.keys(dataSource).length) {
            this._updateBreadcrumbs(dataSource);
            this._updateHeaderState(dataSource);
        }
    }

    _getDataSource() {
        const { product, location: { state } } = this.props;
        const productIsLoaded = Object.keys(product).length > 0;
        const locationStateExists = state && Object.keys(state.product).length > 0;

        // return nothing, if no product in url state and no loaded product
        if (!locationStateExists && !productIsLoaded) return {};

        // use product from props, if product is loaded and state does not exist, or state product is equal loaded product
        const useLoadedProduct = productIsLoaded && (
            (locationStateExists && (product.id === state.product.id))
            || !locationStateExists
        );

        return useLoadedProduct ? product : state.product;
    }

    /**
     * Check if product varian has changed
     * @param {Object} props
     * @param {Object} prevProps
     * @return {Boolean}
     */
    _variantIndexInPropsChanged(props, prevProps) {
        return ProductPageContainer.getVariantIndexFromProps(props)
            !== ProductPageContainer.getVariantIndexFromProps(prevProps);
    }

    /**
     * Dispatch product data request
     * @return {void}
     */
    _requestProduct() {
        const { requestProduct, location, match } = this.props;
        const options = {
            isSingleProduct: true,
            args: {
                filter: {
                    productUrlPath: getUrlParam(match, location)
                }
            }
        };

        // eslint-disable-next-line react/no-unused-state
        this.setState({ isConfigurationInitialized: false });
        requestProduct(options);
    }

    _updateHeaderState({ name: title }) {
        const { changeHeaderState } = this.props;

        changeHeaderState({
            name: PDP,
            title,
            onBackClick: () => history.goBack()
        });
    }

    /**
     * Dispatch breadcrumbs update
     * @return {void}
     */
    _updateBreadcrumbs(product) {
        const { updateBreadcrumbs } = this.props;
        updateBreadcrumbs(product);
    }

    /**
     * Update query params without adding to history, set configurableVariantIndex
     * @param {Number} variant
     */
    updateUrl(variant) {
        const { configurableVariantIndex } = this.state;

        if (configurableVariantIndex !== variant) {
            updateQueryParamWithoutHistory('variant', variant);
        }

        return this.setState({ configurableVariantIndex: variant });
    }

    render() {
        return (
            <ProductPage
              { ...this.props }
              { ...this.state }
              { ...this.containerFunctions }
              { ...this.containerProps() }
            />
        );
    }
}

ProductPageContainer.propTypes = {
    location: PropTypes.shape({
        pathname: PropTypes.string.isRequired,
        state: PropTypes.shape({
            product: ProductType
        })
    }),
    isOnlyPlaceholder: PropTypes.bool
};

ProductPageContainer.defaultProps = {
    location: { state: {} },
    isOnlyPlaceholder: false
};

const ProductPageContainerWrapper = connect(mapStateToProps, mapDispatchToProps)(ProductPageContainer);
export default withRouter(ProductPageContainerWrapper);
