/**
 * External dependencies
 */
import { useWooBlockProps } from '@woocommerce/block-templates';
import { __, _n } from '@wordpress/i18n';
import { __experimentalUseProductEntityProp as useProductEntityProp } from '@woocommerce/product-editor';
import { map, some, pickBy, isEmpty } from 'lodash';
import {
	SelectControl as Select,
	Flex,
	TextControl,
	Button,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { Attribute } from './components';
import { addTerm } from './helpers';
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 */
export function Edit( { attributes } ) {
	const blockProps = useWooBlockProps( attributes );

	const { property, postType } = attributes;

	const [ attributeImages, setAttributeImagesValue ] = useProductEntityProp(
		property,
		{
			postType,
			fallbackValue: false,
		}
	);

	const { productAttributes, data } = attributeImages;

	const [ actionField, setActionField ] = useState( '' );
	const [ searchQuery, setSearchQuery ] = useState( '' );

	return (
		<div { ...blockProps }>
			{ ! isEmpty( productAttributes ) && (
				<Flex
					justify="end"
					className="wp-block-iconic-woothumbs-attribute-images__header"
				>
					<TextControl
						value={ searchQuery }
						onChange={ setSearchQuery }
						placeholder={ __(
							'Filter attribute terms...',
							'iconic-woothumbs'
						) }
					/>

					<Select value={ actionField } onChange={ setActionField }>
						<option value="" disabled>
							{ __(
								'Add attribute images...',
								'iconic-woothumbs'
							) }
						</option>
						<option value="all" disabled={ data?.[ 'all' ] }>
							{ __( 'For all attributes', 'iconic-woothumbs' ) }
						</option>

						{ productAttributes && (
							<optgroup
								label={ __(
									'For a specific attribute',
									'iconic-woothumbs'
								) }
							>
								{ map( productAttributes, ( attribute ) => {
									return (
										<option
											disabled={
												data[ attribute.value ]?.terms
													.length ===
												Object.keys( attribute.terms )
													.length +
													1
											}
											key={ attribute.value }
											value={ attribute.value }
										>
											{ attribute.label }
										</option>
									);
								} ) }
							</optgroup>
						) }
					</Select>

					<Button
						variant="secondary"
						disabled={ ! actionField }
						onClick={ () => {
							if ( ! actionField ) {
								return;
							}

							if ( 'all' === actionField ) {
								setAttributeImagesValue(
									addTerm(
										'all',
										__(
											'All Atributes',
											'iconic-woothumbs'
										),
										'',
										attributeImages
									)
								);
								setActionField( '' );

								return;
							}

							const availableTerms = Object.values(
								pickBy(
									{
										...{ 0: 'Any' },
										...productAttributes[ actionField ][
											'terms'
										],
									},
									( value ) => {
										return ! some(
											data?.[ actionField ]?.terms,
											[ 'term', value ]
										);
									}
								)
							);

							if ( availableTerms.length < 2 ) {
								setActionField( '' );
							}

							setAttributeImagesValue(
								addTerm(
									actionField,
									productAttributes[ actionField ][
										'data-label'
									],
									availableTerms[ 0 ],
									attributeImages
								)
							);
						} }
					>
						{ __( 'Add', 'iconic-woothumbs' ) }
					</Button>
				</Flex>
			) }

			{ map( data, ( attributeImage, attributeName ) => (
				<Attribute
					attributeName={ attributeName }
					attributeImage={ attributeImage }
					productAttributes={ productAttributes }
					atributeImagesData={ data }
					attributeImages={ attributeImages }
					setAttributeImagesValue={ setAttributeImagesValue }
					searchQuery={ searchQuery }
				/>
			) ) }
		</div>
	);
}
