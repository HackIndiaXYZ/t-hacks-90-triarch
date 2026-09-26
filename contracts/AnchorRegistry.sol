// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AnchorRegistry
 * @dev Minimal, privacy-preserving on-chain anchor registry for W3C Verifiable Credentials.
 * Stores ONLY 32-byte cryptographic credential hashes and timestamps on Ethereum Sepolia.
 * NEVER stores holder PII, raw credential payloads, or private keys.
 */
contract AnchorRegistry {
    struct Anchor {
        bool exists;
        uint256 timestamp;
        address anchoredBy;
    }

    // Mapping from SHA-256 / Keccak-256 credential hash (bytes32) to Anchor metadata
    mapping(bytes32 => Anchor) private _anchors;

    // Total count of uniquely anchored credentials
    uint256 public totalAnchored;

    // Events
    event CredentialAnchored(
        bytes32 indexed credentialHash,
        address indexed anchoredBy,
        uint256 timestamp
    );

    error CredentialAlreadyAnchored(bytes32 credentialHash);
    error InvalidCredentialHash();

    /**
     * @notice Anchors a cryptographic credential hash to the blockchain.
     * @param credentialHash The 32-byte hash of the canonical signed W3C Verifiable Credential.
     */
    function anchorCredential(bytes32 credentialHash) external {
        if (credentialHash == bytes32(0)) {
            revert InvalidCredentialHash();
        }
        if (_anchors[credentialHash].exists) {
            revert CredentialAlreadyAnchored(credentialHash);
        }

        _anchors[credentialHash] = Anchor({
            exists: true,
            timestamp: block.timestamp,
            anchoredBy: msg.sender
        });

        totalAnchored += 1;

        emit CredentialAnchored(credentialHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Checks if a credential hash has been anchored.
     * @param credentialHash The 32-byte hash to verify.
     * @return exists True if the credential hash is anchored on-chain.
     */
    function isAnchored(bytes32 credentialHash) external view returns (bool exists) {
        return _anchors[credentialHash].exists;
    }

    /**
     * @notice Retrieves full anchor metadata for a given credential hash.
     * @param credentialHash The 32-byte hash to inspect.
     * @return exists Whether the anchor exists.
     * @return timestamp The block timestamp when it was anchored.
     * @return anchoredBy The wallet address that submitted the anchor.
     */
    function getAnchor(bytes32 credentialHash)
        external
        view
        returns (
            bool exists,
            uint256 timestamp,
            address anchoredBy
        )
    {
        Anchor memory a = _anchors[credentialHash];
        return (a.exists, a.timestamp, a.anchoredBy);
    }
}
