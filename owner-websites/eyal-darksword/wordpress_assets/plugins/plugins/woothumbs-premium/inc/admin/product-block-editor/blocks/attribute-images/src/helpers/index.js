/**
 * External dependencies
 */
import { _n } from '@wordpress/i18n';
import { omit } from 'lodash';

/**
 * Add term to the Attribute Images data.
 *
 * @param {String} attribute The attribute slug.
 * @param {String} attributeLabel The attribute label.
 * @param {String} termValue The term value
 * @param {Object} attributeImages The attribute images data.
 * @returns {Object}
 */
function addTerm( attribute, attributeLabel, termValue, attributeImages ) {
	if ( 'all' === attribute ) {
		const newAttributeImages = {
			...attributeImages,
			data: {
				...attributeImages.data,
				[ attribute ]: {
					label:
						attributeLabel ||
						attributeImages.data[ attribute ]?.label ||
						'',
					terms: [
						{
							term: 'all',
							images: [],
						},
					],
				},
			},
		};

		return newAttributeImages;
	}

	const newAttributeImages = {
		...attributeImages,
		data: {
			...attributeImages.data,
			[ attribute ]: {
				label:
					attributeLabel ||
					attributeImages.data[ attribute ]?.label ||
					'',
				terms: [
					...( attributeImages.data[ attribute ]?.terms || [] ),
					{
						term: termValue || 'Any',
						images: [],
					},
				],
			},
		},
	};

	return newAttributeImages;
}

/**
 * Remove the term from the Attribute Images data.
 *
 * @param {String} term The term value
 * @param {String} attribute The attribute slug.
 * @param {Object} attributeImages The attribute images data.
 * @returns {Object}
 */
function removeTerm( term, attribute, attributeImages ) {
	if ( 'all' === attribute ) {
		const newAttributeImages = {
			...attributeImages,
			data: omit( attributeImages.data, [ 'all' ] ),
		};

		return newAttributeImages;
	}

	const newAttributeImages = {
		...attributeImages,
		data: {
			...attributeImages.data,
			[ attribute ]: {
				...attributeImages.data[ attribute ],
				terms: attributeImages.data[ attribute ]?.terms?.filter(
					( element ) => element.term !== term
				),
			},
		},
	};

	return newAttributeImages;
}

/**
 * Updates the value of a term in the attribute images object.
 *
 * This function updates the value of a specific term within the attribute images object.
 * It is typically used to modify the term data for a given attribute.
 *
 * @param {string} newTerm - The new term value to be set.
 * @param {string} currentTerm - The current term value that needs to be updated.
 * @param {string} attribute - The attribute slug to which the term belongs.
 * @param {Object} attributeImages - The object containing attribute images data.
 * @returns {Object} - The updated attribute images object with the new term value.
 */
function updateTermValue( newTerm, currentTerm, attribute, attributeImages ) {
	const newAttributeImages = {
		...attributeImages,
		data: {
			...attributeImages.data,
			[ attribute ]: {
				...attributeImages.data[ attribute ],
				terms: attributeImages.data[ attribute ]?.terms?.map(
					( element ) => {
						if ( element.term !== currentTerm ) {
							return element;
						}

						return {
							...element,
							term: newTerm,
						};
					}
				),
			},
		},
	};

	return newAttributeImages;
}

/**
 * Adds an image to a specific term within the attribute images object.
 *
 * @param {Object} image - The image object to be added.
 * @param {string} term - The term to which the image should be added.
 * @param {string} attribute - The attribute slug to which the term belongs.
 * @param {Object} attributeImages - The object containing attribute images data.
 * @returns {Object} - The updated attribute images object with the new image added to the specified term.
 *
 */
function addImageToTerm( newImages, term, attribute, attributeImages ) {
	const newAttributeImages = {
		...attributeImages,
		data: {
			...attributeImages.data,
			[ attribute ]: {
				...attributeImages.data[ attribute ],
				terms: attributeImages.data[ attribute ]?.terms?.map(
					( element ) => {
						if ( element.term !== term ) {
							return element;
						}

						return {
							...element,
							images: [ ...element.images, ...newImages ],
						};
					}
				),
			},
		},
	};

	return newAttributeImages;
}

/**
 * Removes an image from a specific term within the attribute images object.
 *
 * @param {number} imageId - The ID of the image to be removed.
 * @param {string} term - The term from which the image should be removed.
 * @param {string} attribute - The attribute slug to which the term belongs.
 * @param {Object} attributeImages - The object containing attribute images data.
 * @returns {Object} - The updated attribute images object with the image removed from the specified term.
 */
function removeTermImage( imageId, term, attribute, attributeImages ) {
	const newAttributeImages = {
		...attributeImages,
		data: {
			...attributeImages.data,
			[ attribute ]: {
				...attributeImages.data[ attribute ],
				terms: attributeImages.data[ attribute ]?.terms?.map(
					( element ) => {
						if ( element.term !== term ) {
							return element;
						}

						return {
							...element,
							images: element.images?.filter(
								( image ) => imageId !== image.id
							),
						};
					}
				),
			},
		},
	};

	return newAttributeImages;
}

export {
	addTerm,
	removeTerm,
	updateTermValue,
	removeTermImage,
	addImageToTerm,
};
